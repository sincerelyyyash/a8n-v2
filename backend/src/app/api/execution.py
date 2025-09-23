from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
    credentials_query = select(Credential).where(Credential.userId == user_id)
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
    db: AsyncSession = Depends(async_get_db)
):

    try:

        workflow_query = select(Workflow).where(
            Workflow.id == data.workflow_id,
            Workflow.user_id == data.user_id
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
        
        user_credentials = await get_user_credentials(data.user_id, db)
        
        connections_query = select(Connection).where(
            Connection.workflow_id == data.workflow_id
        )
        connections_result = await db.execute(connections_query)
        connections = connections_result.scalars().all()
        
        execution_data = {
            "user_id": data.user_id,
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

        async with db.begin():
            db.add(
                Execution(
                    execution_id=execution_id,
                    user_id=data.user_id,
                    workflow_id=data.workflow_id,
                    node_id=None,
                    status=ExecutionStatus.QUEUED.value,
                )
            )
        
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
    db: AsyncSession = Depends(async_get_db)
):
    """
    Execute single node by sending execution data to Redis queue
    """
    try:

        workflow_query = select(Workflow).where(
            Workflow.id == data.workflow_id,
            Workflow.user_id == data.user_id
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
        
        user_credentials = await get_user_credentials(data.user_id, db)
        
        execution_data = {
            "user_id": data.user_id,
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

        async with db.begin():
            db.add(
                Execution(
                    execution_id=execution_id,
                    user_id=data.user_id,
                    workflow_id=data.workflow_id,
                    node_id=data.node_id,
                    status=ExecutionStatus.QUEUED.value,
                )
            )
        
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
    data: ExecutionStatusUpdate, db: AsyncSession = Depends(async_get_db)
):
    try:
        result = await db.execute(
            select(Execution).where(Execution.execution_id == data.execution_id)
        )
        execution = result.scalar_one_or_none()
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")

        async with db.begin():
            execution.status = data.status.value
            if data.result is not None:
                execution.result = data.result
            if data.error is not None:
                execution.error = data.error
        return {"message": "Status updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

