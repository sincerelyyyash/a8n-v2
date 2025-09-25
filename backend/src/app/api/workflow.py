from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..schemas.workflow_schema import (
    WorkflowCreate,
    WorkflowUpdate,
)
from ..models.workflow_model import Workflow
from ..models.node_model import Node
from ..models.connection_model import Connection
from ..core.db.db import async_get_db

router = APIRouter(prefix="/api/v1/workflow", tags=["workflows"])


@router.post("/create")
async def create_workflow(
    workflow: WorkflowCreate, db: AsyncSession = Depends(async_get_db), request: Request = None
):
    try:
        authed_user_id = getattr(request.state, "user_id", None)
        if authed_user_id is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        result = await db.execute(
            select(Workflow).where(
                (Workflow.user_id == authed_user_id)
                & ((Workflow.name == workflow.name) | (Workflow.title == workflow.title))
            )
        )
        existing_wf = result.scalar_one_or_none()

        if existing_wf:
            raise HTTPException(
                status_code=400, detail="Workflow with this name or title exists"
            )

        new_wf = Workflow(
            name=workflow.name,
            title=workflow.title,
            enabled=workflow.enabled,
            user_id=authed_user_id,
        )
        db.add(new_wf)
        await db.flush()

        new_nodes = []
        client_to_db_id: dict[int, int] = {}
        for node in workflow.nodes:
            n = Node(
                positionX=node.positionX,
                positionY=node.positionY,
                data=node.data,
                workflow_id=new_wf.id,
            )
            db.add(n)
            await db.flush()
            new_nodes.append(n)
            temp_id = node.data.get("temp_id") if isinstance(node.data, dict) else None
            if temp_id is not None:
                client_to_db_id[int(temp_id)] = n.id

        new_conns = []
        for conn in workflow.connections:
            from_id = client_to_db_id.get(conn.from_node_id, conn.from_node_id)
            to_id = client_to_db_id.get(conn.to_node_id, conn.to_node_id)
            c = Connection(
                from_node_id=from_id,
                to_node_id=to_id,
                workflow_id=new_wf.id,
            )
            db.add(c)
            new_conns.append(c)

        await db.commit()

        return {
            "message": "Workflow created successfully",
            "workflow_id": new_wf.id,
            "nodes": [n.id for n in new_nodes],
            "connections": [c.id for c in new_conns],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/update")
async def update_workflow(
    data: WorkflowUpdate,
    user_id: int | None = Query(None),
    db: AsyncSession = Depends(async_get_db),
    request: Request = None,
):
    try:
        if not data.id:
            raise HTTPException(status_code=400, detail="Workflow id is required")

        authed_user_id = getattr(request.state, "user_id", user_id)
        if authed_user_id is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        result = await db.execute(
            select(Workflow).where(
                (Workflow.id == data.id) & (Workflow.user_id == authed_user_id)
            )
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Apply allowed updates
        if data.name is not None:
            workflow.name = data.name
        if data.title is not None:
            workflow.title = data.title
        if data.enabled is not None:
            workflow.enabled = data.enabled

        # Nodes/connections update is not implemented here to keep API simple

        await db.commit()
        await db.refresh(workflow)

        return {
            "message": "Workflow updated successfully",
            "data": {
                "id": workflow.id,
                "name": workflow.name,
                "title": workflow.title,
                "enabled": workflow.enabled,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")


@router.get("/")
async def get_workflow(
    workflow_id: int = Query(...), user_id: int = Query(None), db: AsyncSession = Depends(async_get_db), request: Request = None
):
    """
    Fetch a single workflow by workflow_id and user_id (query params).
    """
    try:
        authed_user_id = getattr(request.state, "user_id", user_id)
        result = await db.execute(
            select(Workflow).where(
                (Workflow.id == workflow_id) & (Workflow.user_id == authed_user_id)
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
    user_id: int = Query(None), db: AsyncSession = Depends(async_get_db), request: Request = None
):
    """
    Fetch all workflows for a given user_id.
    """
    try:
        authed_user_id = getattr(request.state, "user_id", user_id)
        result = await db.execute(select(Workflow).where(Workflow.user_id == authed_user_id))
        workflows = result.scalars().all()

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
    workflow_id: int = Query(...), user_id: int = Query(None), db: AsyncSession = Depends(async_get_db), request: Request = None
):
    """
    Delete a workflow by workflow_id and user_id.
    """
    try:
        authed_user_id = getattr(request.state, "user_id", user_id)
        result = await db.execute(
            select(Workflow).where(
                (Workflow.id == workflow_id) & (Workflow.user_id == authed_user_id)
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

