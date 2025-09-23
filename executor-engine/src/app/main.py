import asyncio
from .services.redis_service import process_execution_queue


async def main():
    task = asyncio.create_task(process_execution_queue())
    await task


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

