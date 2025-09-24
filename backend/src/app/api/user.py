from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.user_model import User
from ..utils.auth_utils import hash_password, verify_password, create_jwt, decode_jwt
from ..core.db.db import async_get_db
from ..schemas.user_schema import UserCreate, UserRead, UserSignIn

router = APIRouter(prefix="/api/v1/user", tags=["user"])


@router.post("/signup")
async def register_user(
    user: UserCreate, response: Response, db: AsyncSession = Depends(async_get_db)
):
    try:
        result = await db.execute(select(User).where(User.email == user.email))
        existingUser = result.scalar_one_or_none()

        if existingUser:
            raise HTTPException(status_code=400, detail="User already exists")

        hashed_pw = hash_password(user.password)
        new_user = User(
            email=user.email,
            password=hashed_pw,
            first_name=user.first_name,
            last_name=user.last_name,
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        token = create_jwt(new_user.id)
        cookie_kwargs = {
            "httponly": True,
            "secure": bool(int(__import__('os').getenv("COOKIE_SECURE", "0"))),
            "samesite": __import__('os').getenv("COOKIE_SAMESITE", "Lax"),
        }
        response.set_cookie(key="token", value=token, **cookie_kwargs)
        response.set_cookie(key="user_id", value=str(new_user.id), **cookie_kwargs)

        return {
            "message": "User created successfully",
            "data": {"user": new_user.id, "token": token},
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/signin")
async def login_user(
    user: UserSignIn,
    response: Response,
    db: AsyncSession = Depends(async_get_db),
):
    try:
        result = await db.execute(select(User).where(User.email == user.email))
        db_user = result.scalar_one_or_none()

        if not db_user or not verify_password(user.password, db_user.password):
            raise HTTPException(status_code=400, detail="Invalid credentials")

        token = create_jwt(db_user.id)
        cookie_kwargs = {
            "httponly": True,
            "secure": bool(int(__import__('os').getenv("COOKIE_SECURE", "0"))),
            "samesite": __import__('os').getenv("COOKIE_SAMESITE", "Lax"),
        }
        response.set_cookie(key="token", value=token, **cookie_kwargs)
        response.set_cookie(key="user_id", value=str(db_user.id), **cookie_kwargs)

        return {"message": "user logged in successfully", "data": {"user": db_user.id, "token": token}}

    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/")
async def get_user(token: str | None = Cookie(default=None), db: AsyncSession = Depends(async_get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_jwt(token)
    if not payload:
        raise HTTPException(status_code=403, detail="Invalid or expired token")

    try:
        result = await db.execute(select(User).where(User.id == payload["user_id"]))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "message": "User fetched successfully",
            "data": UserRead.model_validate(user),
        }

    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
