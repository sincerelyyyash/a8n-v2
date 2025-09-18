from fastapi import FastAPI
from .api.user import router as user_router
from .api.credentials import router as credential_router
from .api.workflow import router as workflow_router

app = FastAPI()


app.include_router(user_router)
app.include_router(credential_router)
app.include_router(workflow_router)


@app.get("/")
def read_root():
    return {"Hello World"}
