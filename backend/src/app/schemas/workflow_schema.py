from typing import Annotated, Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict


class NodeCreate(BaseModel):
    positionX: float
    positionY: float
    data: Dict


class ConnectionCreate(BaseModel):
    from_node_id: int
    to_node_id: int


class WorkflowBase(BaseModel):
    id: Optional[int] = None
    name: Annotated[str, Field(min_length=2, max_length=30)]
    title: Annotated[str, Field(min_length=2, max_length=30)]
    enabled: bool = False
    user_id: int


class WorkflowCreate(WorkflowBase):
    nodes: List[NodeCreate]
    connections: List[ConnectionCreate]


class WorkflowUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Optional[int] = None
    name: Optional[str] = None
    title: Optional[str] = None
    enabled: Optional[bool] = None
    user_id: Optional[int] = None
    nodes: Optional[List[NodeCreate]] = None
    connections: Optional[List[ConnectionCreate]] = None


class WorkflowDelete(BaseModel):
    id: int
    user_id: int


class WorkflowRead(BaseModel):
    id: int
    user_id: int


class WorkflowAllRead(BaseModel):
    user_id: int
