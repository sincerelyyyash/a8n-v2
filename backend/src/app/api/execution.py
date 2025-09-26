from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from ..core.db.db import async_get_db
from ..models.workflow_model import Workflow
from ..models.node_model import Node
from ..models.credential_model import Credential
from ..models.connection_model import Connection
from ..schemas.execution_schema import (
    WorkflowExecutionCreate, 
    NodeExecutionCreate, 
    ExecutionResponse
)
from ..utils.redis import add_to_execution_queue, get_execution_status
from ..models.execution_model import Execution
from ..schemas.execution_schema import ExecutionStatus, ExecutionStatusUpdate


router = APIRouter(prefix="/api/v1/execution")


async def get_user_credentials(user_id: int, db: AsyncSession) -> dict:
    credentials_query = select(Credential).where(Credential.user_id == user_id)
    result = await db.execute(credentials_query)
    credentials = result.scalars().all()
    
    credentials_dict = {}
    for cred in credentials:
        credentials_dict[cred.platform] = {
            "id": cred.id,
            "title": cred.title,
            "platform": cred.platform,
            "data": cred.data
        }
    
    return credentials_dict


@router.post("/workflow", response_model=ExecutionResponse)
async def execute_workflow(
    data: WorkflowExecutionCreate, 
    request: Request,
    db: AsyncSession = Depends(async_get_db),
):

    try:

        authed_user_id = getattr(request.state, "user_id", None)
        if authed_user_id is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        workflow_query = select(Workflow).where(
            Workflow.id == data.workflow_id,
            Workflow.user_id == authed_user_id,
        )
        result = await db.execute(workflow_query)
        workflow = result.scalar_one_or_none()
        
        if not workflow:
            raise HTTPException(
                status_code=404, 
                detail="Workflow not found or does not belong to user"
            )
        

        nodes_query = select(Node).where(Node.workflow_id == data.workflow_id)
        nodes_result = await db.execute(nodes_query)
        nodes = nodes_result.scalars().all()
        
        user_credentials = await get_user_credentials(authed_user_id, db)
        
        connections_query = select(Connection).where(
            Connection.workflow_id == data.workflow_id
        )
        connections_result = await db.execute(connections_query)
        connections = connections_result.scalars().all()
        
        execution_data = {
            "user_id": authed_user_id,
            "workflow_id": data.workflow_id,
            "execution_type": data.execution_type,
            "workflow_name": workflow.name,
            "workflow_title": workflow.title,
            "credentials": user_credentials,
            "connections": [
                {"from": c.from_node_id, "to": c.to_node_id}
                for c in connections
            ],
            "nodes": [
                {
                    "id": node.id,
                    "positionX": node.positionX,
                    "positionY": node.positionY,
                    "data": node.data
                }
                for node in nodes
            ]
        }
        

        execution_id = await add_to_execution_queue(execution_data)

        db.add(
            Execution(
                execution_id=execution_id,
                user_id=authed_user_id,
                workflow_id=data.workflow_id,
                node_id=None,
                status=ExecutionStatus.QUEUED.value,
            )
        )
        await db.commit()
        
        return ExecutionResponse(
            execution_id=execution_id,
            status="queued",
            message="Workflow execution queued successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/node", response_model=ExecutionResponse)
async def execute_node(
    data: NodeExecutionCreate, 
    request: Request,
    db: AsyncSession = Depends(async_get_db),
):
    """
    Execute single node by sending execution data to Redis queue
    """
    try:

        authed_user_id = getattr(request.state, "user_id", None)
        if authed_user_id is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        workflow_query = select(Workflow).where(
            Workflow.id == data.workflow_id,
            Workflow.user_id == authed_user_id
        )
        result = await db.execute(workflow_query)
        workflow = result.scalar_one_or_none()
        
        if not workflow:
            raise HTTPException(
                status_code=404, 
                detail="Workflow not found or does not belong to user"
            )
        

        node_query = select(Node).where(
            Node.id == data.node_id,
            Node.workflow_id == data.workflow_id
        )
        node_result = await db.execute(node_query)
        node = node_result.scalar_one_or_none()
        
        if not node:
            raise HTTPException(
                status_code=404, 
                detail="Node not found or does not belong to workflow"
            )
        
        user_credentials = await get_user_credentials(authed_user_id, db)
        
        execution_data = {
            "user_id": authed_user_id,
            "workflow_id": data.workflow_id,
            "node_id": data.node_id,
            "execution_type": data.execution_type,
            "workflow_name": workflow.name,
            "workflow_title": workflow.title,
            "credentials": user_credentials,
            "node": {
                "id": node.id,
                "positionX": node.positionX,
                "positionY": node.positionY,
                "data": node.data
            }
        }
        

        execution_id = await add_to_execution_queue(execution_data)

        db.add(
            Execution(
                execution_id=execution_id,
                user_id=authed_user_id,
                workflow_id=data.workflow_id,
                node_id=data.node_id,
                status=ExecutionStatus.QUEUED.value,
            )
        )
        await db.commit()
        
        return ExecutionResponse(
            execution_id=execution_id,
            status="queued",
            message="Node execution queued successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/status/{execution_id}")
async def get_execution_status_endpoint(execution_id: str):

    try:
        status = await get_execution_status(execution_id)
        return status
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/status/update")
async def update_execution_status_endpoint(
    data: ExecutionStatusUpdate,
    db: AsyncSession = Depends(async_get_db),
    x_engine_secret: str | None = Header(default=None, alias="X-Engine-Secret"),
):
    try:
        expected = __import__('os').getenv("ENGINE_STATUS_SECRET", None)
        if expected and x_engine_secret != expected:
            raise HTTPException(status_code=401, detail="Unauthorized status update")

        result = await db.execute(
            select(Execution).where(Execution.execution_id == data.execution_id)
        )
        execution = result.scalar_one_or_none()
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")

        execution.status = data.status.value
        if data.result is not None:
            execution.result = data.result
        if data.error is not None:
            execution.error = data.error
        await db.commit()
        return {"message": "Status updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/list")
async def list_executions(
    request: Request,
    user_id: int | None = Query(None),
    workflow_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(async_get_db),
):
    try:
        authed_user_id = getattr(request.state, "user_id", user_id)
        if authed_user_id is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        query = select(Execution).where(Execution.user_id == authed_user_id)
        if workflow_id is not None:
            query = query.where(Execution.workflow_id == workflow_id)
        query = query.order_by(desc(Execution.created_at)).offset(offset).limit(limit)

        result = await db.execute(query)
        executions = result.scalars().all()

        return {
            "message": "Executions fetched successfully",
            "data": [
                {
                    "execution_id": e.execution_id,
                    "status": e.status,
                    "user_id": e.user_id,
                    "workflow_id": e.workflow_id,
                    "node_id": e.node_id,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                    "updated_at": e.updated_at.isoformat() if e.updated_at else None,
                }
                for e in executions
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

