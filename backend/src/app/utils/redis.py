import asyncio
import aioredis
import json
import uuid
from typing import Dict, Any


async def redisClient(key: str, value: str):
    redis = await aioredis.from_url("redis://localhost")

    await redis.set(key, value)

    await redis.close()


async def add_to_execution_queue(execution_data: Dict[str, Any]) -> str:

    redis = await aioredis.from_url("redis://localhost")
    

    execution_id = str(uuid.uuid4())
    execution_data["execution_id"] = execution_id
    

    queue_key = f"execution_queue:{execution_id}"
    await redis.set(queue_key, json.dumps(execution_data), ex=3600)  # Expire in 1 hour
    

    await redis.lpush("execution_queue", execution_id)
    
    await redis.close()
    return execution_id


async def get_execution_status(execution_id: str) -> Dict[str, Any]:

    redis = await aioredis.from_url("redis://localhost")
    
    status_key = f"execution_status:{execution_id}"
    status_data = await redis.get(status_key)
    
    await redis.close()
    
    if status_data:
        return json.loads(status_data)
    return {"status": "not_found"}

