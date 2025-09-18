from typing import List
from fastapi import APIRouter, Depends, HTTPException, 
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

router = APIRouter(prefix="/api/v1/credential")


@router.post("/create")
async def add_credentials(
    credential: CredentialCreate, db: AsyncSession = Depends(async_get_db())
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
    credential: CredentialPublicRead, db: AsyncSession = Depends(async_get_db())
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

        return {
            "message": "Credenial fetched successfully",
            "data": {"credential": {cred.title, cred.platform, cred.id}},
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=List[CredentialRead])
async def get_all_credentials(
    credential: CredentialAllRead, db: AsyncSession = Depends(async_get_db())
):
    try:
        results = await db.execute(
            select(Credential).where(
                (Credential.user_id == credential.user_id)
            )
        )

        credentials = results.scalar.all()

        if not credentials:
            raise HTTPException(
                status_code=400, detail="Credential not found or does not exist"
            )

        return {"message": "Credentials fetched successfully", "data": {credentials}}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error {str(e)}")
