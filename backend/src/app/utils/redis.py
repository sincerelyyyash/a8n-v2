import asyncio
import os
import json
import uuid
from typing import Dict, Any
from redis.asyncio import Redis


async def redisClient(key: str, value: str):
    redis_url = os.getenv("REDIS_URL", "redis://localhost")
    redis: Redis = Redis.from_url(redis_url)
    try:
        await redis.set(key, value)
    finally:
        await redis.close()


async def add_to_execution_queue(execution_data: Dict[str, Any]) -> str:

    redis_url = os.getenv("REDIS_URL", "redis://localhost")
    redis: Redis = Redis.from_url(redis_url)
    

    execution_id = str(uuid.uuid4())
    execution_data["execution_id"] = execution_id

    if "retry_count" not in execution_data:
        execution_data["retry_count"] = 0
    

    queue_key = f"execution_queue:{execution_id}"
    await redis.set(queue_key, json.dumps(execution_data), ex=3600)  # Expire in 1 hour
    

    await redis.lpush("execution_queue", execution_id)
    
    await redis.close()
    return execution_id


async def get_execution_status(execution_id: str) -> Dict[str, Any]:

    redis_url = os.getenv("REDIS_URL", "redis://localhost")
    redis: Redis = Redis.from_url(redis_url)
    
    status_key = f"execution_status:{execution_id}"
    status_data = await redis.get(status_key)
    
    await redis.close()
    
    if status_data:
        return json.loads(status_data)

    # Fallback to DB if not in Redis
    try:
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import AsyncSession
        from ..core.db.db import async_get_db
        from ..models.execution_model import Execution
        async def _fetch():
            async for db in async_get_db():
                result = await db.execute(select(Execution).where(Execution.execution_id == execution_id))
                e = result.scalar_one_or_none()
                if e:
                    return {
                        "execution_id": execution_id,
                        "status": e.status,
                        "result": e.result,
                        "error": e.error,
                    }
                return {"status": "not_found"}
        return await _fetch()
    except Exception:
        return {"status": "not_found"}

