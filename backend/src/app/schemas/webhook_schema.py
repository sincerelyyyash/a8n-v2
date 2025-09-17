
from pydantic import BaseModel, Field, ConfigDict

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
    name: Optional[Annotated[str, Field(min_length=2, max_length=20)]]= None
    method: Optional[Annotated[str, Field(min_length=2, max_length=20)]] = None 
    path: Optional[Annotated[str, Field(min_length=2, max_length=20)]] = None
    header: Optional[Annotated[str, Field(min_length=2, max_length=20)]] = None
    secret: Optional[Annotated[str, Field(min_length=2, max_length=30)] =  None

class WebhookDelete(WebhookBase):
    pass
