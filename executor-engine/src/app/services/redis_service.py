import asyncio
import os
import json
from typing import Dict, Any, Optional
import httpx
from redis.asyncio import Redis

async def redisClient(key: str):
    redis_url = os.getenv("REDIS_URL", "redis://localhost")
    redis: Redis = Redis.from_url(redis_url)
    value = await redis.get(key)
    print(f"Retrieved value: {value.decode('utf-8')}")
    await redis.close()

async def get_execution_from_queue() -> Optional[Dict[str, Any]]:
    redis_url = os.getenv("REDIS_URL", "redis://localhost")
    redis: Redis = Redis.from_url(redis_url)
    try:
        execution_id = await redis.brpop("execution_queue", timeout=1)
        if not execution_id:
            return None
        execution_id = execution_id[1].decode('utf-8')
        queue_key = f"execution_queue:{execution_id}"
        execution_data = await redis.get(queue_key)
        if execution_data:
            execution_dict = json.loads(execution_data)
            await redis.delete(queue_key)
            return execution_dict
        return None
    except Exception as e:
        print(f"Error getting execution from queue: {e}")
        return None
    finally:
        await redis.close()

async def update_execution_status(execution_id: str, status: str, result: Dict[str, Any] = None):
    redis_url = os.getenv("REDIS_URL", "redis://localhost")
    redis: Redis = Redis.from_url(redis_url)
    try:
        status_data = {
            "execution_id": execution_id,
            "status": status,
            "result": result or {},
            "timestamp": asyncio.get_event_loop().time()
        }
        status_key = f"execution_status:{execution_id}"
        await redis.set(status_key, json.dumps(status_data), ex=3600)
    except Exception as e:
        print(f"Error updating execution status: {e}")
    finally:
        await redis.close()

async def process_execution_queue():
    while True:
        try:
            execution_data = await get_execution_from_queue()
            if execution_data:
                execution_id = execution_data.get("execution_id")
                execution_type = execution_data.get("execution_type")
                print(f"Processing execution {execution_id} of type {execution_type}")
                await update_execution_status(execution_id, "processing")
                await post_status_update_backend(execution_id, "processing")
                try:
                    if execution_type == "workflow":
                        result = await process_workflow_execution(execution_data)
                    elif execution_type == "node":
                        result = await process_node_execution(execution_data)
                    else:
                        result = {"error": "Unknown execution type"}
                    await update_execution_status(execution_id, "completed", result)
                    await post_status_update_backend(execution_id, "completed", result=result)
                    print(f"Execution {execution_id} completed successfully")
                except Exception as e:
                    retry_count = int(execution_data.get("retry_count", 0))
                    if retry_count < 3:
                        print(f"Execution {execution_id} failed (attempt {retry_count+1}). Retrying...")
                        await requeue_execution_with_retry(execution_data, retry_count + 1)
                    else:
                        await update_execution_status(execution_id, "failed", {"error": str(e)})
                        await post_status_update_backend(execution_id, "failed", error={"error": str(e)})
                        print(f"Execution {execution_id} permanently failed after retries: {e}")
            else:
                await asyncio.sleep(1)
        except Exception as e:
            print(f"Error in execution queue processing: {e}")
            await asyncio.sleep(5)

async def process_workflow_execution(execution_data: Dict[str, Any]) -> Dict[str, Any]:
    workflow_id = execution_data.get("workflow_id")
    nodes = execution_data.get("nodes", [])
    connections = execution_data.get("connections", [])
    credentials = execution_data.get("credentials", {})
    print(f"Processing workflow {workflow_id} with {len(nodes)} nodes")

    node_map = {n.get("id"): n for n in nodes}
    adjacency: Dict[int, list[int]] = {}
    in_degree: Dict[int, int] = {n.get("id"): 0 for n in nodes}
    for c in connections:
        from_id = c.get("from")
        to_id = c.get("to")
        adjacency.setdefault(from_id, []).append(to_id)
        in_degree[to_id] = in_degree.get(to_id, 0) + 1

    ready = [nid for nid, deg in in_degree.items() if deg == 0]
    execution_order: list[int] = []
    context: Dict[str, Any] = {"results": {}, "trigger": execution_data.get("trigger")}

    while ready:
        node_id = ready.pop(0)
        execution_order.append(node_id)
        for child in adjacency.get(node_id, []):
            in_degree[child] = in_degree.get(child, 0) - 1
            if in_degree[child] == 0:
                ready.append(child)

    if len(execution_order) != len(node_map):
        raise RuntimeError("Workflow graph has cycles or disconnected nodes")

    for node_id in execution_order:
        node = node_map.get(node_id)
        if not node:
            continue
        prepared_node = resolve_node_inputs_with_context(node, context)
        node_result = await process_single_node(prepared_node, credentials)
        context["results"][str(node_id)] = node_result

    return {
        "workflow_id": workflow_id,
        "order": execution_order,
        "results": context["results"],
    }

async def process_node_execution(execution_data: Dict[str, Any]) -> Dict[str, Any]:
    node = execution_data.get("node")
    node_id = execution_data.get("node_id")
    credentials = execution_data.get("credentials", {})
    print(f"Processing node {node_id}")
    context: Dict[str, Any] = {"results": {}, "trigger": execution_data.get("trigger")}
    prepared_node = resolve_node_inputs_with_context(node, context)
    result = await process_single_node(prepared_node, credentials)
    return {
        "node_id": node_id,
        "result": result
    }

async def process_single_node(node: Dict[str, Any], credentials: Dict[str, Any]) -> Dict[str, Any]:
    node_id = node.get("id")
    node_data = node.get("data", {})
    node_type = node_data.get("type", "unknown")
    
    if node_type == "ai_agent":
        from .ai_agent_service import execute_agent
        result = await execute_agent(
            user_schema=node_data.get("schema", {}),
            messages=node_data.get("messages", []),
            formatted_response=node_data.get("formatted_response", False)
        )
    elif node_type == "email":
        from .email_service import send_email
        email_creds = credentials.get("email", {})
        cred_data = email_creds.get("data", {})
        result = await send_email(
            sender_email=cred_data.get("sender_email", ""),
            sender_password=cred_data.get("sender_password", ""),
            receiver_email=node_data.get("receiver_email", ""),
            subject=node_data.get("subject", ""),
            msg=node_data.get("message", ""),
            smtp_server=cred_data.get("smtp_server", "")
        )
    elif node_type == "telegram":
        from .telegram_service import send_telegram_message
        telegram_creds = credentials.get("telegram", {})
        cred_data = telegram_creds.get("data", {})
        result = await send_telegram_message(
            bot_token=cred_data.get("bot_token", ""),
            chat_id=node_data.get("chat_id", ""),
            message_text=node_data.get("message", "")
        )
    else:
        result = {"status": "processed", "type": node_type}
    
    return {
        "node_id": node_id,
        "type": node_type,
        "result": result
    }

def resolve_node_inputs_with_context(node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    data = node.get("data", {})
    resolved_data = _resolve_templates(data, context)
    new_node = dict(node)
    new_node["data"] = resolved_data
    return new_node

def _resolve_templates(value: Any, context: Dict[str, Any]) -> Any:
    if isinstance(value, dict):
        return {k: _resolve_templates(v, context) for k, v in value.items()}
    if isinstance(value, list):
        return [_resolve_templates(v, context) for v in value]
    if isinstance(value, str):
        if value.startswith("{{") and value.endswith("}}"):
            expr = value[2:-2].strip()
            return _eval_context_path(expr, context)
    return value

def _eval_context_path(expr: str, context: Dict[str, Any]) -> Any:
    parts = expr.split('.')
    current: Any = context
    for p in parts:
        if isinstance(current, dict):
            current = current.get(p)
        else:
            return None
    return current

async def post_status_update_backend(
    execution_id: str,
    status: str,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[Dict[str, Any]] = None,
):
    backend_base_url = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
    engine_secret = os.getenv("ENGINE_STATUS_SECRET", "")
    url = f"{backend_base_url.rstrip('/')}/api/v1/execution/status/update"
    payload: Dict[str, Any] = {
        "execution_id": execution_id,
        "status": status,
    }
    if result is not None:
        payload["result"] = result
    if error is not None:
        payload["error"] = error

    try:
        headers = {"X-Engine-Secret": engine_secret} if engine_secret else {}
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(url, json=payload, headers=headers)
    except Exception as e:
        print(f"Failed to post status update to backend: {e}")

async def requeue_execution_with_retry(execution_data: Dict[str, Any], retry_count: int) -> None:
    redis_url = os.getenv("REDIS_URL", "redis://localhost")
    redis: Redis = Redis.from_url(redis_url)
    try:
        execution_data["retry_count"] = retry_count
        execution_id = execution_data.get("execution_id")
        queue_key = f"execution_queue:{execution_id}"
        await redis.set(queue_key, json.dumps(execution_data), ex=3600)
        await redis.lpush("execution_queue", execution_id)
    except Exception as e:
        print(f"Error requeuing execution {execution_data.get('execution_id')}: {e}")
    finally:
        await redis.close()
