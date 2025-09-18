from typing import List
from app.schemas.workflow_schema import (
    WorkflowAllRead,
    WorkflowCreate,
    WorkflowDelete,
    WorkflowRead,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from . import model
from ..core.db.db import async_get_db


router = APIRouter()


@router.post("/create")
async def create_workflow(
    workflow: WorkflowCreate, db: AsyncSession = Depends(async_get_db)
):
    try:
        result = await db.execute(
            select(model.Workflow).where(
                (model.Workflow.name == workflow.name)
                | (model.Workflow.title == workflow.title)
            )
        )
        existing_wf = result.scalar_one_or_none()

        if existing_wf:
            raise HTTPException(
                status_code=400, detail="Workflow with this name or title exists"
            )

        async with db.begin():
            new_wf = model.Workflow(
                name=workflow.name,
                title=workflow.title,
                enabled=workflow.enabled,
                user_id=workflow.user_id,
            )
            db.add(new_wf)
            await db.flush()

            new_nodes = []
            for node in workflow.nodes:
                n = model.Node(
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
                c = model.Connection(
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
async def getWorkflow(
    workflow: WorkflowRead, db: AsyncSession = Depends(async_get_db())
):
    try:
        result = await db.execute(
            select(model.Workflow).where((model.Workflow.id == workflow.id))
            & (model.Workflow.user_id == workflow.user_id)
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise HTTPException(
                status_code=500, detail=" Workflow not found or does not exist"
            )

        return {"message": "Workflow fetched successfully", "data": {workflow}}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")


@router.get("/all")
async def getAllWorkflow(
    workflow: WorkflowAllRead, db: AsyncSession = Depends(async_get_db())
):
    try:
        result = await db.execute(
            select(model.Workflow).where(model.Workflow.user_id == workflow.user_id)
        )
        workflows = result.scalar.all()

        if not workflows:
            raise HTTPException(status_code=400, detail="No workflows found")

        return {"message": "Workflows fetched successfully", "data": {workflows}}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")


@router.delete("/")
async def deleteWorkflow(
    workflow: WorkflowDelete, db: AsyncSession = Depends(async_get_db())
):
    try:
        result = await db.execute(
            select(model.Workflow).where((model.Workflow.id == workflow.id))
            & (model.Workflow.user_id == workflow.user_id)
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise HTTPException(status_code=400, detail="Workflow not found")

        await db.delete(workflow)
        await db.commit()

        return {"message": "Workflow deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")
