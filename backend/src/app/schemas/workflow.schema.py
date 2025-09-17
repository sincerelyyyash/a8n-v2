from typing import Annotated, Optional

from pydantic import BaseModel, Field, ConfigDict


class WorkflowBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=30)]
    title: Annotated[str, Field(min_length=2, max_length=30)]
    enabled: Annotated[bool, Field(default=False)]
    userId: Annotated[str]


class WorkflowRead(WorkflowBase):
    pass


class WorkflowUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[Annotated[str, Field(min_length=2, max_length=30)]] = None
    title: Optional[Annotated[str, Field(min_length=2, max_length=30)]] = None
    enabled: Optional[bool] = None
    userId: Optional[str] = None


class WorkflowCreate(WorkflowBase):
    pass

class WorkflowDelete(BaseModel):
    id: Annotated[str, Field(nullable=False)]
