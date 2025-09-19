from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.db.db import async_get_db
from ..schemas.credential_schema import (
    CredentialAllRead,
    CredentialCreate,
    CredentialPublicRead,
    CredentialRead,
    CredentialUpdate,
)
from ..models.credential_model import Credential

router = APIRouter(prefix="/api/v1/credential", tags=["credentials"])


@router.post("/create")
async def add_credentials(
    credential: CredentialCreate, db: AsyncSession = Depends(async_get_db)
):
    try:
        new_cred = Credential(
            user_id=credential.user_id,
            title=credential.title,
            platform=credential.platform,
            data=credential.data,
        )
        db.add(new_cred)
        await db.commit()
        await db.refresh(new_cred)

        return {
            "message": "Credentials added successfully",
            "data": {"credential_id": new_cred.id},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/update")
async def update_credential(
    credential: CredentialUpdate, db: AsyncSession = Depends(async_get_db)
):
    try:
        result = await db.execute(
            select(Credential).where(
                (Credential.id == credential.id)
                & (Credential.user_id == credential.user_id)
            )
        )
        cred = result.scalar_one_or_none()

        if not cred:
            raise HTTPException(
                status_code=400, detail="Credential not found or does not exist"
            )

        if credential.data is not None:
            cred.data = credential.data
        if credential.title is not None:
            cred.title = credential.title
        if credential.platform is not None:
            cred.platform = credential.platform

        await db.commit()
        await db.refresh(cred)

        return {
            "message": "Credential updated successfully",
            "data": {"credential_id": cred.id},
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/")
async def get_credential(
    credential_id: int = Query(...), user_id: int = Query(...), db: AsyncSession = Depends(async_get_db)
):
    """
    Fetch a single credential by credential_id and user_id (as query params).
    """
    try:
        result = await db.execute(
            select(Credential).where(
                (Credential.id == credential_id) & (Credential.user_id == user_id)
            )
        )
        cred = result.scalar_one_or_none()

        if not cred:
            raise HTTPException(
                status_code=400, detail="Credential not found or does not exist"
            )

        return {
            "message": "Credential fetched successfully",
            "data": {
                "id": cred.id,
                "title": cred.title,
                "platform": cred.platform,
                "user_id": cred.user_id,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=List[CredentialRead])
async def get_all_credentials(
    user_id: int = Query(...), db: AsyncSession = Depends(async_get_db)
):
    """
    Fetch all credentials for a given user_id.
    """
    try:
        results = await db.execute(select(Credential).where(Credential.user_id == user_id))
        credentials = results.scalars().all()

        if not credentials:
            raise HTTPException(
                status_code=400, detail="No credentials found for this user"
            )

        return credentials

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")

