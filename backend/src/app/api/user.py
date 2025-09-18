from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from . import model, auth, schema


from ..core.db.db import async_get_db
from ..schemas.user_schema import UserCreate

router = APIRouter()


@router.post("/signup")
async def register_user(
    user: UserCreate, response: Response, db: AsyncSession = Depends(async_get_db)
):
    try:
        result = await db.execute(
            select(model.User).where(model.User.email == user.email)
        )
        existingUser = result.scalar_one_or_none()

        if existingUser:
            raise HTTPException(status_code=400, detail="User already exists")

        hashed_pw = auth.hashed_pw(user.password)
        new_user = model.User(
            email=user.email,
            password=hashed_pw,
            first_name=user.first_name,
            last_name=user.last_name,
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        token = auth.create_jwt(new_user.id)
        response.set_cookie(key="token", value=token, httponly=True)

        return {
            "message": "User created successfully",
            "data": {"user": new_user.id, "token": token},
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


router.post("/signin")


async def login_user(
    user: schema.UserSignIn,
    response: Response,
    db: AsyncSession = Depends(async_get_db()),
):
    try:
        result = await db.execute(
            select(model.User).where(model.User.email == user.email)
        )
        db_user = result.scalar_one_or_none()

        if not db_user or not auth.verify_password(user.password, db_user.password):
            raise HTTPException(status_code=400, detail="Invalid credentials")

        token = auth.create_jwt(db_user.id)
        response.set_cookie(key="token", value=token, httponly=True)

        return {"message": "user logged in successfully", "data": token}

    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


router.get("/")


async def get_user(
    token: str | None = None, db: AsyncSession = Depends(async_get_db())
):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = auth.decode_jwt(token)
    if not payload:
        raise HTTPException(status_code=403, detail="Invalid or expired token")

    try:
        result = await db.execute(
            select(model.User).where(model.User.id == payload["user_id"])
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "message": "User fetched successfully",
            "data": schema.UserRead.model_validate(user),
        }

    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
