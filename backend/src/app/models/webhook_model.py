from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.db import Base


class Webhook(Base):
    __tablename__ = "webhook"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(20), nullable=False)
    method: Mapped[str] = mapped_column(String(20), nullable=False)
    path: Mapped[str] = mapped_column(String(20), nullable=False)
    header: Mapped[str] = mapped_column(String(20))
    secret: Mapped[str] = mapped_column(String(30))
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflow.id"), nullable=False)

    workflow = relationship("Workflow", back_populates="webhooks")
