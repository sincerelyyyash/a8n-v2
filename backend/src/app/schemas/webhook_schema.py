from typing import Annotated
from pydantic import BaseModel, Field


class WebhookBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=20)]
    method: Annotated[str, Field(min_length=2, max_length=20)]
    path: Annotated[str, Field(min_length=2, max_length=20)]
    header: Annotated[str, Field(min_length=2, max_length=20)]
    secret: Annotated[str, Field(min_length=2, max_length=30)]
    workflowId: Annotated[int, Field(min_length=2, max_length=30)]


class WebhookRead(WebhookBase):
    name: Annotated[str, Field(min_length=2, max_length=20)]
    method: Annotated[str, Field(min_length=2, max_length=20)]
    path: Annotated[str, Field(min_length=2, max_length=20)]
    header: Annotated[str, Field(min_length=2, max_length=20)]
    workflowId: Annotated[int, Field(min_length=2, max_length=30)]


class WebhookUpdate(WebhookBase):
    id: Annotated[int, Field(...)]
    user_id: Annotated[int, Field(...)]
    secret: Annotated[str, Field(...)]


class WebhookDelete(WebhookBase):
    pass
