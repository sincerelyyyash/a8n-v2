from typing import Annotated, Optional

from pydantic import BaseModel, Field, ConfigDict


class CredentialBase(BaseModel):
    userId: Annotated[int, Field(min_length=2, max_length=20)]
    title: Annotated[str, Field(min_length=2, max_length=20)]
    platform: Annotated[str, Field(min_length=2, max_length=20)]
    data: Annotated[Dict]

class CredentialPublicRead(CredentialBase):
    userId: Annotated[int, Field(min_length=2, max_length=20)]
    title: Annotated[str, Field(min_length=2, max_length=20)]
    platform: Annotated[str, Field(min_length=2, max_length=20)]

class CredentialUpdate(CredentialBase):
    title: Optional[ Annotated[str, Field(min_length=2, max_length=20)]] = None
    platform: Optional[ Annotated[str, Field(min_length=2, max_length=20)]] = None
    data: Optional[ Annotated[Dict]] = None

class CredentialCreate(CredentialBase):
    title: Annotated[str, Field(min_length=2, max_length=20)]
    platform: Annotated[str, Field(min_length=2, max_length=20)]
    data: Annotated[Dict]

class CredentialsDelete(CredentialBase):
    pass

