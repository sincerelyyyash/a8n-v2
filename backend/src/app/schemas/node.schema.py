from typing import Annotated, Optional

from pydantic import BaseModel, Field, ConfigDict
    positionX: Mapped[float] = mapped_column(Float)
    positionY: Mapped[float] = mapped_column(Float)

    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflow.id"),
        nullable=False,
    )
    workflow = relationship("Workflow", back_populates="nodes")


class NodeBase(BaseModel):
    positionX: Annotated[float, Field(min_length=2, max_length=20)]
    positionY: Annotated[float, Field(min_length=2, max_length=20)]
    workflow_id: Annotated[int, Field(min_length=2, max_length=20)]

class NodeCreate(NodeBase):
    pass

class NodeRead(NodeBase):
    pass

class NodeDelete(NodeBase):
    pass
