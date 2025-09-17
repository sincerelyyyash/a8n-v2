from sqlalchemy import String, Integer, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.db import Base

class Connection(Base):
    __tablename__ = "connection"

    id: Mapped[int] = mapped_column(
        Integer,
        autoincrement=True,
        primary_key=True,
        unique=True,
        nullable=False,
    )

    from_node_id: Mapped[int] = mapped_column(ForeignKey("node.id"))
    to_node_id: Mapped[int] = mapped_column(ForeignKey("node.id"))

    from_node = relationship("Node", foreign_keys=[from_node_id], back_populates="connections_from")
    to_node = relationship("Node", foreign_keys=[to_node_id], back_populates="connections_to")

    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflow.id"))
    workflow = relationship("Workflow", back_populates="connections")
