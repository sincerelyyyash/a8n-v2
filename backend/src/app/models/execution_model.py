from sqlalchemy import Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from ..core.db.db import Base


class Execution(Base):
    __tablename__ = "execution"

    id: Mapped[int] = mapped_column(
        Integer,
        autoincrement=True,
        primary_key=True,
        unique=True,
        nullable=False,
    )

    execution_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    workflow_id: Mapped[int] = mapped_column(Integer, nullable=True)
    node_id: Mapped[int] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    result: Mapped[dict] = mapped_column(JSON, nullable=True)
    error: Mapped[dict] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow)


