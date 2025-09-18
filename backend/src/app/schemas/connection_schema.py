# from typing import Annotated, Optional
#
# from pydantic import BaseModel, Field
#
# class ConnectionBase(BaseModel):
#     user_id: Annotated[int, Field(min_length=2, max_length=20)]
#     from_node_id: Annotated[str, Field(min_length=2, max_length=20)]
#     to_node_id: Annotated[str, Field(min_length=2, max_length=20)]
#     workflow_id: Annotated[int, Field(min_length=2, max_length=20)]
#
# class ConnectionRead(ConnectionBase):
#     pass
#
# class ConnectionUpdate(ConnectionBase):
#     from_node_id: Optional[Annotated[str, Field(min_length=2, max_length=20)]] = None
#     to_node_id: Optional[Annotated[str, Field(min_length=2, max_length=20)]] = None
#     workflow_id: Optional[Annotated[int, Field(min_length=2, max_length=20)] = None
#
# class ConnectionCreate(ConnectionBase):
#     pass
#
# class ConnectionDelete(ConnectionBase):
#     pass
