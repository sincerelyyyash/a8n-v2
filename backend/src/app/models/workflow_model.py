
from sqlalchemy import String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.db import Base


class Workflow(Base):
    __tablename__ = "workflow"

    id: Mapped[int] = mapped_column(
        Integer,
        autoincrement=True,
        unique=True,
        primary_key=True,
        nullable=False,
        init=False,
    )

    name: Mapped[str] = mapped_column(String(18))
    title: Mapped[str] = mapped_column(String(20))

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id"),
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="workflows")
    nodes = relationship("Node", back_populates="workflow")
    connections = relationship("Connection", back_populates="workflow")
    webhooks= relationship("Webhook", back_populates="workflow")


