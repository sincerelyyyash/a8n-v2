from typing import Annotated, Dict, Optional
from enum import Enum

from pydantic import BaseModel, Field
from typing import Dict, Optional


class ExecutionStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExecutionType(str, Enum):
    WORKFLOW = "workflow"
    NODE = "node"


class ExecutionBase(BaseModel):
    user_id: Annotated[int, Field(gt=0)]
    workflow_id: Annotated[int, Field(gt=0)]
    execution_type: ExecutionType


class WorkflowExecutionCreate(BaseModel):
    user_id: Annotated[int, Field(gt=0)]
    workflow_id: Annotated[int, Field(gt=0)]
    execution_type: ExecutionType = ExecutionType.WORKFLOW


class NodeExecutionCreate(BaseModel):
    user_id: Annotated[int, Field(gt=0)]
    workflow_id: Annotated[int, Field(gt=0)]
    node_id: Annotated[int, Field(gt=0)]
    execution_type: ExecutionType = ExecutionType.NODE


class ExecutionResponse(BaseModel):
    execution_id: str
    status: str
    message: str


class ExecutionRecord(BaseModel):
    id: int
    execution_id: str
    user_id: int
    workflow_id: Optional[int]
    node_id: Optional[int]
    status: ExecutionStatus
    result: Optional[Dict]
    error: Optional[Dict]


class ExecutionStatusUpdate(BaseModel):
    execution_id: str
    status: ExecutionStatus
    result: Optional[Dict] = None
    error: Optional[Dict] = None


class ExecuteNode(BaseModel):
    user_id: Annotated[int, Field(gt=0)]
    workflow_id: Annotated[int, Field(gt=0)]
    node_id: Annotated[int, Field(gt=0)]
