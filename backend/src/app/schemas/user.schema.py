from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserBase(BaseModel):
    first_name: Annotated[str, Field(min_length=2, max_length=30)]
    last_name: Annotated[str, Field(min_length=2, max_length=30)]
    email: Annotated[EmailStr, Field(min_length=4, max_length=30)]
    password: Annotated[str, Field(min_length=8, max_length=16)]


class UserRead(BaseModel):
    id: int

    first_name: Annotated[str, Field(min_length=2, max_length=30,)]
    last_name: Annotated[str, Field(min_length=2, max_length=30)]
    email: Annotated[EmailStr)]


class UserCreate(UserBase):
    model_config = ConfigDict(extra="forbid")

    password: Annotated[str, Field(pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$", examples=["Str1ngst!"])]


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_name: Annotated[str | None, Field(min_length=2, max_length=30, default=None)]
    last_name: Annotated[str | None, Field(min_length=2, max_length=30, default=None)]

