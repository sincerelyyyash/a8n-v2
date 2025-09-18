from typing import Annotated
from pydantic import BaseModel, Field


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
