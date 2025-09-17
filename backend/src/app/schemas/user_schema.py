from typing import Annotated
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class UserBase(BaseModel):
    first_name: Annotated[str, Field(min_length=2, max_length=30)]
    last_name: Annotated[str, Field(min_length=2, max_length=30)]
    email: Annotated[EmailStr, Field(min_length=4, max_length=30)]
    password: Annotated[str, Field(min_length=8, max_length=16)]


class UserRead(BaseModel):
    id: int
    first_name: Annotated[str, Field(min_length=2, max_length=30)]
    last_name: Annotated[str, Field(min_length=2, max_length=30)]
    email: Annotated[EmailStr, Field(...)]


class UserCreate(UserBase):
    model_config = ConfigDict(extra="forbid")
    password: Annotated[
        str,
        Field(
            pattern=r"^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,16}$",
            examples=["Str1ngSt!"],
        ),
    ]


class UserUpdate(UserBase):
    model_config = ConfigDict(extra="forbid")
    first_name: Annotated[str, Field(min_length=2, max_length=30)]
    last_name: Annotated[str, Field(min_length=2, max_length=30)]


class UserSignIn(BaseModel):
    email: Annotated[EmailStr, Field(min_length=2, max_length=30)]
    password: Annotated[str, Field(min_length=8, max_length=16)]

