from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.db import Base

class Webhook(Base):
    __tablename__ = "webhook"

    id: Mapped[int] = mapped_column("id", autoincrement=True, nullable=False, unique=True, init=False)

    name: Mapped[str] = mapped_column(String(20))
    method : Mapped[str]= mapped_column(String(20))
    path : Mapped[str]= mapped_column(String(20))
    header : Mapped[str]= mapped_column(String(20))
    secret : Mapped[str]= mapped_column(String(30))
    workflowId : Mapped[int]= mapped_column(Integer, ForeignKey=("workflow.id"), nullable=False) 
    workflow = relationship("Workflow", backpopulates="webhook")

