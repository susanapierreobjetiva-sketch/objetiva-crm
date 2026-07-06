from fastapi import APIRouter, HTTPException, Request, Depends
from bson import ObjectId, errors as bson_errors
from datetime import datetime, timezone
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    client_id: Optional[str] = ""
    client_name: Optional[str] = ""
    due_date: Optional[str] = ""
    priority: Optional[str] = "Normal"
    assigned_to_id: Optional[str] = ""
    assigned_to: Optional[str] = ""


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    estado: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assigned_to: Optional[str] = None


def valid_oid(id: str) -> ObjectId:
    try:
        return ObjectId(id)
    except (bson_errors.InvalidId, Exception):
        raise HTTPException(400, "ID inválido")


def format_task(d):
    return {
        "id":               str(d["_id"]),
        "title":            d.get("title", ""),
        "description":      d.get("description", ""),
        "client_id":        d.get("client_id", ""),
        "client_name":      d.get("client_name", ""),
        "due_date":         d.get("due_date", ""),
        "priority":         d.get("priority", "Normal"),
        "estado":           d.get("estado", "Pendiente"),
        "assigned_to_id":   d.get("assigned_to_id", ""),
        "assigned_to":      d.get("assigned_to", ""),
        "created_by":       d.get("created_by", ""),
        "created_by_name":  d.get("created_by_name", ""),
        "created_at":       d.get("created_at", ""),
        "updated_at":       d.get("updated_at", ""),
    }


@router.get("")
async def get_tasks(request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    if True:  # todos ven todas las tareas
        docs = await db["tasks"].find().sort("due_date", 1).to_list(1000)
    else:
        docs = await db["tasks"].find({
            "$or": [
                {"assigned_to_id": str(current_user["_id"])},
                {"created_by":     str(current_user["_id"])},
            ]
        }).sort("due_date", 1).to_list(1000)
    return [format_task(d) for d in docs]


@router.get("/client/{client_id}")
async def get_tasks_by_client(client_id: str, request: Request, current_user=Depends(get_current_user)):
    db   = request.app.db
    docs = await db["tasks"].find({"client_id": client_id}).sort("due_date", 1).to_list(100)
    return [format_task(d) for d in docs]


@router.post("")
async def create_task(request: Request, body: TaskCreate, current_user=Depends(get_current_user)):
    db  = request.app.db
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        **body.dict(),
        "estado":           "Pendiente",
        "created_by":       str(current_user["_id"]),
        "created_by_name":  current_user.get("name", ""),
        "created_at":       now,
        "updated_at":       now,
    }
    result    = await db["tasks"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return format_task(doc)


@router.put("/{task_id}")
async def update_task(task_id: str, request: Request, body: TaskUpdate, current_user=Depends(get_current_user)):
    db     = request.app.db
    oid    = valid_oid(task_id)
    update = {k: v for k, v in body.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db["tasks"].update_one({"_id": oid}, {"$set": update})
    doc = await db["tasks"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Tarea no encontrada")
    return format_task(doc)


@router.delete("/{task_id}")
async def delete_task(task_id: str, request: Request, current_user=Depends(get_current_user)):
    db  = request.app.db
    oid = valid_oid(task_id)
    await db["tasks"].delete_one({"_id": oid})
    return {"ok": True}
