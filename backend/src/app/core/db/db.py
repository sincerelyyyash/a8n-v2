from collections.abc import AsyncGenerator
from typing import Optional
import os
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass


class Base(DeclarativeBase, MappedAsDataclass):
    pass


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async_engine = (
    create_async_engine(DATABASE_URL, echo=False, future=True) if DATABASE_URL else None
)

local_session: Optional[async_sessionmaker[AsyncSession]] = (
    async_sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False)
    if async_engine
    else None
)


async def async_get_db() -> AsyncGenerator[AsyncSession, None]:
    if not local_session:
        raise RuntimeError("Database session is not configured. Check DATABASE_URL.")
    async with local_session() as db:
        yield db
