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
                id=None,
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
                id=None,
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
        print(f"DEBUG: Received update request for workflow {data.id}")
        print(f"DEBUG: Data: {data}")
        
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

        # Handle nodes and connections update if provided
        client_to_db_id: dict[int, int] = {}
        
        if data.nodes is not None:
            print(f"DEBUG: Processing {len(data.nodes)} nodes")
            try:
                # Delete existing nodes for this workflow
                existing_nodes_result = await db.execute(
                    select(Node).where(Node.workflow_id == data.id)
                )
                existing_nodes = existing_nodes_result.scalars().all()
                print(f"DEBUG: Deleting {len(existing_nodes)} existing nodes")
                for node in existing_nodes:
                    await db.delete(node)
                
                # Add new nodes
                for i, node in enumerate(data.nodes):
                    print(f"DEBUG: Adding node {i}: {node}")
                    print(f"DEBUG: Node data type: {type(node.data)}")
                    print(f"DEBUG: Node data content: {node.data}")
                    
                    # Ensure data is a dict
                    node_data = node.data if isinstance(node.data, dict) else {}
                    
                    # Create Node with explicit id=None for auto-increment
                    n = Node(
                        id=None,
                        positionX=float(node.positionX),
                        positionY=float(node.positionY),
                        data=node_data,
                        workflow_id=int(data.id),
                    )
                    db.add(n)
                    await db.flush()
                    temp_id = node_data.get("temp_id") if isinstance(node_data, dict) else None
                    if temp_id is not None:
                        client_to_db_id[int(temp_id)] = n.id
                        print(f"DEBUG: Mapped temp_id {temp_id} to node_id {n.id}")
            except Exception as e:
                print(f"DEBUG: Error processing nodes: {e}")
                raise

        if data.connections is not None:
            print(f"DEBUG: Processing {len(data.connections)} connections")
            try:
                # Delete existing connections for this workflow
                existing_connections = await db.execute(
                    select(Connection).where(Connection.workflow_id == data.id)
                )
                existing_conns = existing_connections.scalars().all()
                print(f"DEBUG: Deleting {len(existing_conns)} existing connections")
                for conn in existing_conns:
                    await db.delete(conn)
                
                # Add new connections
                for i, conn in enumerate(data.connections):
                    print(f"DEBUG: Adding connection {i}: {conn}")
                    from_id = client_to_db_id.get(conn.from_node_id, conn.from_node_id)
                    to_id = client_to_db_id.get(conn.to_node_id, conn.to_node_id)
                    print(f"DEBUG: Connection from {from_id} to {to_id}")
                    c = Connection(
                        id=None,
                        from_node_id=int(from_id),
                        to_node_id=int(to_id),
                        workflow_id=int(data.id),
                    )
                    db.add(c)
            except Exception as e:
                print(f"DEBUG: Error processing connections: {e}")
                raise

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
    workflow_id: int = Query(...), user_id: int = Query(None), include_nodes: bool = Query(False), db: AsyncSession = Depends(async_get_db), request: Request = None
):
    """
    Fetch a single workflow by workflow_id and user_id (query params).
    If include_nodes=True, also returns nodes and connections.
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

        response_data = {
            "id": workflow.id,
            "name": workflow.name,
            "title": workflow.title,
            "enabled": workflow.enabled,
            "user_id": workflow.user_id,
        }

        if include_nodes:
            # Fetch nodes
            nodes_result = await db.execute(
                select(Node).where(Node.workflow_id == workflow_id)
            )
            nodes = nodes_result.scalars().all()
            
            # Fetch connections
            connections_result = await db.execute(
                select(Connection).where(Connection.workflow_id == workflow_id)
            )
            connections = connections_result.scalars().all()
            
            response_data["nodes"] = [
                {
                    "id": node.id,
                    "positionX": node.positionX,
                    "positionY": node.positionY,
                    "data": node.data,
                }
                for node in nodes
            ]
            response_data["connections"] = [
                {
                    "id": conn.id,
                    "from_node_id": conn.from_node_id,
                    "to_node_id": conn.to_node_id,
                }
                for conn in connections
            ]

        return {
            "message": "Workflow fetched successfully",
            "data": response_data,
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

