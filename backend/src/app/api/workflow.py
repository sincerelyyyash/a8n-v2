from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..schemas.workflow_schema import (
    WorkflowCreate,
)
from ..models.workflow_model import Workflow
from ..models.node_model import Node
from ..models.connection_model import Connection
from ..core.db.db import async_get_db

router = APIRouter(prefix="/api/v1/workflow", tags=["workflows"])


@router.post("/create")
async def create_workflow(
    workflow: WorkflowCreate, db: AsyncSession = Depends(async_get_db)
):
    try:
        result = await db.execute(
            select(Workflow).where(
                (Workflow.name == workflow.name) | (Workflow.title == workflow.title)
            )
        )
        existing_wf = result.scalar_one_or_none()

        if existing_wf:
            raise HTTPException(
                status_code=400, detail="Workflow with this name or title exists"
            )

        async with db.begin():
            new_wf = Workflow(
                name=workflow.name,
                title=workflow.title,
                enabled=workflow.enabled,
                user_id=workflow.user_id,
            )
            db.add(new_wf)
            await db.flush()

            new_nodes = []
            for node in workflow.nodes:
                n = Node(
                    positionX=node.positionX,
                    positionY=node.positionY,
                    data=node.data,
                    workflow_id=new_wf.id,
                )
                db.add(n)
                new_nodes.append(n)

            await db.flush()

            new_conns = []
            for conn in workflow.connections:
                c = Connection(
                    from_node_id=conn.from_node_id,
                    to_node_id=conn.to_node_id,
                    workflow_id=new_wf.id,
                )
                db.add(c)
                new_conns.append(c)

        return {
            "message": "Workflow created successfully",
            "workflow_id": new_wf.id,
            "nodes": [n.id for n in new_nodes],
            "connections": [c.id for c in new_conns],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/")
async def get_workflow(
    workflow_id: int = Query(...), user_id: int = Query(...), db: AsyncSession = Depends(async_get_db)
):
    """
    Fetch a single workflow by workflow_id and user_id (query params).
    """
    try:
        result = await db.execute(
            select(Workflow).where(
                (Workflow.id == workflow_id) & (Workflow.user_id == user_id)
            )
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise HTTPException(
                status_code=404, detail="Workflow not found or does not exist"
            )

        return {
            "message": "Workflow fetched successfully",
            "data": {
                "id": workflow.id,
                "name": workflow.name,
                "title": workflow.title,
                "enabled": workflow.enabled,
                "user_id": workflow.user_id,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")


@router.get("/all")
async def get_all_workflows(
    user_id: int = Query(...), db: AsyncSession = Depends(async_get_db)
):
    """
    Fetch all workflows for a given user_id.
    """
    try:
        result = await db.execute(select(Workflow).where(Workflow.user_id == user_id))
        workflows = result.scalars().all()

        if not workflows:
            raise HTTPException(status_code=404, detail="No workflows found")

        return {
            "message": "Workflows fetched successfully",
            "data": [
                {
                    "id": wf.id,
                    "name": wf.name,
                    "title": wf.title,
                    "enabled": wf.enabled,
                    "user_id": wf.user_id,
                }
                for wf in workflows
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")


@router.delete("/")
async def delete_workflow(
    workflow_id: int = Query(...), user_id: int = Query(...), db: AsyncSession = Depends(async_get_db)
):
    """
    Delete a workflow by workflow_id and user_id.
    """
    try:
        result = await db.execute(
            select(Workflow).where(
                (Workflow.id == workflow_id) & (Workflow.user_id == user_id)
            )
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        await db.delete(workflow)
        await db.commit()

        return {"message": "Workflow deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")

