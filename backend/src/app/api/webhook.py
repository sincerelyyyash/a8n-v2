from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request
import hmac
import hashlib
import time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.db.db import async_get_db
from ..models.webhook_model import Webhook
from ..models.workflow_model import Workflow
from ..models.node_model import Node
from ..models.connection_model import Connection
from ..models.credential_model import Credential
from ..models.execution_model import Execution
from ..schemas.execution_schema import ExecutionStatus
from ..utils.redis import add_to_execution_queue


router = APIRouter(prefix="/api/v1/webhook")


async def _get_user_credentials(user_id: int, db: AsyncSession) -> dict:
    result = await db.execute(select(Credential).where(Credential.user_id == user_id))
    credentials = result.scalars().all()
    out: Dict[str, Any] = {}
    for cred in credentials:
        out[cred.platform] = {
            "id": cred.id,
            "title": cred.title,
            "platform": cred.platform,
            "data": cred.data,
        }
    return out


@router.api_route("/{webhook_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def handle_webhook(webhook_path: str, request: Request, db: AsyncSession = Depends(async_get_db)):
    try:
        method = request.method.upper()
        full_path = "/" + webhook_path if not webhook_path.startswith("/") else webhook_path
        raw_body = await request.body()

        result = await db.execute(
            select(Webhook).where((Webhook.path == full_path) & (Webhook.method == method))
        )
        webhook = result.scalar_one_or_none()
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook not found")

        header_key = webhook.header
        if header_key:
            signature = request.headers.get(header_key)
            timestamp = request.headers.get("X-Timestamp")
            if not signature or not timestamp:
                raise HTTPException(status_code=401, detail="Missing signature or timestamp")
            try:
                ts_int = int(timestamp)
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid timestamp")
            now = int(time.time())
            if abs(now - ts_int) > 300:
                raise HTTPException(status_code=401, detail="Stale timestamp")

            secret = webhook.secret or ""
            message = f"{method}\n{full_path}\n{timestamp}\n".encode("utf-8") + raw_body
            computed = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(computed, signature):
                raise HTTPException(status_code=401, detail="Invalid signature")

        wf_result = await db.execute(select(Workflow).where(Workflow.id == webhook.workflow_id))
        workflow = wf_result.scalar_one_or_none()
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        nodes_result = await db.execute(select(Node).where(Node.workflow_id == workflow.id))
        nodes = nodes_result.scalars().all()

        conns_result = await db.execute(select(Connection).where(Connection.workflow_id == workflow.id))
        connections = conns_result.scalars().all()

        credentials = await _get_user_credentials(workflow.user_id, db)

        try:
            body = await request.json()
        except Exception:
            body = None

        trigger_payload = {
            "headers": dict(request.headers),
            "query": dict(request.query_params),
            "body": body,
            "method": method,
            "path": full_path,
        }

        execution_data = {
            "user_id": workflow.user_id,
            "workflow_id": workflow.id,
            "execution_type": "workflow",
            "workflow_name": workflow.name,
            "workflow_title": workflow.title,
            "credentials": credentials,
            "connections": [{"from": c.from_node_id, "to": c.to_node_id} for c in connections],
            "nodes": [
                {
                    "id": n.id,
                    "positionX": n.positionX,
                    "positionY": n.positionY,
                    "data": n.data,
                }
                for n in nodes
            ],
            "trigger": trigger_payload,
        }

        execution_id = await add_to_execution_queue(execution_data)

        async with db.begin():
            db.add(
                Execution(
                    execution_id=execution_id,
                    user_id=workflow.user_id,
                    workflow_id=workflow.id,
                    node_id=None,
                    status=ExecutionStatus.QUEUED.value,
                )
            )

        return {"execution_id": execution_id, "status": "queued"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


