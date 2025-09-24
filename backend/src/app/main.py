import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.user import router as user_router
from .api.credentials import router as credential_router
from .api.workflow import router as workflow_router
from .api.webhook import router as webhook_router
from .api.execution import router as execution_router
from .middleware.auth_middleware import AuthValidationMiddleware

app = FastAPI()


allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
app.add_middleware(AuthValidationMiddleware)


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(user_router)
app.include_router(credential_router)
app.include_router(workflow_router)
app.include_router(webhook_router)
app.include_router(execution_router)


@app.get("/")
def read_root():
    return {"Welcome to a8n backend server"}
