from typing import Annotated, Optional, Dict

from pydantic import BaseModel, Field


class CredentialBase(BaseModel):
    userId: Annotated[int, Field(min_length=2, max_length=20)]
    title: Annotated[str, Field(min_length=2, max_length=20)]
    platform: Annotated[str, Field(min_length=2, max_length=20)]
    data: Annotated[Dict, Field(...)]


class CredentialPublicRead(CredentialBase):
    userId: Annotated[int, Field(min_length=2, max_length=30)]
    id: Annotated[int, Field(min_length=2, max_length=30)]


class CredentialAllRead(CredentialBase):
    userId: Annotated[int, Field(min_length=2, max_length=30)]


class CredentialRead(BaseModel):
    userId: Annotated[int, Field(...)]
    id: Annotated[int, Field(...)]
    title: Annotated[str, Field(...)]
    platform: Annotated[str, Field(...)]


class CredentialUpdate(CredentialBase):
    id: Annotated[int, Field(...)]
    user_id: Annotated[int, Field(...)]
    data: Annotated[Dict, Field(...)]


class CredentialCreate(CredentialBase):
    user_id: Annotated[int, Field(...)]
    title: Annotated[str, Field(min_length=2, max_length=20)]
    platform: Annotated[str, Field(min_length=2, max_length=20)]
    data: Annotated[Dict, Field(...)]


class CredentialsDelete(CredentialBase):
    pass
