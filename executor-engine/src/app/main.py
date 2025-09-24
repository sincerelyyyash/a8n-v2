import asyncio
from services.redis_service import process_execution_queue


async def main():
    task = asyncio.create_task(process_execution_queue())
    await task


def cli():
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    cli()

