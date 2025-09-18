from collections.abc import AsyncGenerator
import os
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass


class Base(DeclarativeBase, MappedAsDataclass):
    pass


DATABASE_URL = os.getenv("DATABASE_URL")

async_engine = create_async_engine(DATABASE_URL, echo=False, future=True) if DATABASE_URL else None

if async_engine:
    local_session = async_sessionmaker(
        bind=async_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def async_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with local_session() as db:
            yield db

