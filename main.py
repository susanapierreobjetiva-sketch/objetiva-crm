from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()
from routers import auth, auth_2fa, clients, policies, claims, tasks, dashboard, documents, audit, backup, ai, emails
import os


ALLOWED_ORIGINS = [
    "https://crm.objetivabroker.es",
]

DEV_MODE = os.environ.get("ENV", "production") != "production"

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    app.db = app.mongodb_client["objetiva_crm"]
    print("✅ CRM conectado a MongoDB Atlas")
    yield
    app.mongodb_client.close()

app = FastAPI(
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

TRUSTED_HOSTS = ["crm.objetivabroker.es"]
if os.environ.get("ENV", "production") != "production":
    TRUSTED_HOSTS.append("localhost")

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=TRUSTED_HOSTS,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"http://localhost:\d+" if DEV_MODE else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_2fa.router,     prefix="/api/auth",      tags=["auth"])
app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(clients.router,   prefix="/api/clients",   tags=["clients"])
app.include_router(policies.router,  prefix="/api/policies",  tags=["policies"])
app.include_router(claims.router,    prefix="/api/claims",    tags=["claims"])
app.include_router(tasks.router,     prefix="/api/tasks",     tags=["tasks"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(audit.router,     prefix="/api/audit",     tags=["audit"])
app.include_router(backup.router,    prefix="/api/backup",   tags=["backup"])
app.include_router(ai.router,        prefix="/api/ai",       tags=["ai"])
app.include_router(emails.router,     prefix="/api/emails",   tags=["emails"])

@app.get("/")
async def root():
    return {"status": "CRM online"}
