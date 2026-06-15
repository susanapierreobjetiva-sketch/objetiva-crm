from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from routers import auth, clients
import os

load_dotenv()

app = FastAPI(title="Objetiva CRM")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    app.db = app.mongodb_client["objetiva_crm"]
    print("✅ CRM conectado a MongoDB Atlas")

@app.on_event("shutdown")
async def shutdown():
    app.mongodb_client.close()

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])

@app.get("/")
async def root():
    return {"status": "CRM online"}
