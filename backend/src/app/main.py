from fastapi import FastAPI
from .api.user import router as user_router
from .api.credentials import router as credential_router
from .api.workflow import router as workflow_router
from .api.webhook import router as webhook_router
from .api.execution import router as execution_router

app = FastAPI()


app.include_router(user_router)
app.include_router(credential_router)
app.include_router(workflow_router)
app.include_router(webhook_router)
app.include_router(execution_router)


@app.get("/")
def read_root():
    return {"Welcome to a8n backend server"}
