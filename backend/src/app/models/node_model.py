from sqlalchemy import Integer, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSON

from ..core.db.db import Base


class Node(Base):
    __tablename__ = "node"

    id: Mapped[int] = mapped_column(
        Integer,
        autoincrement=True,
        primary_key=True,
        unique=True,
        nullable=False,
    )

    positionX: Mapped[float] = mapped_column(Float)
    positionY: Mapped[float] = mapped_column(Float)

    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflow.id"),
    )
    workflow = relationship("Workflow", back_populates="nodes")

    connections_from = relationship(
        "Connection",
        back_populates="from_node",
        foreign_keys="[Connection.from_node_id]",
    )
    connections_to = relationship(
        "Connection",
        back_populates="to_node",
        foreign_keys="[Connection.to_node_id]",
    )

    data: Mapped[dict] = mapped_column(JSON)
