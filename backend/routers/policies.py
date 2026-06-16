from fastapi import APIRouter, HTTPException, Request, Depends
from bson import ObjectId
from datetime import datetime, timezone
from models.policy import PolicyCreate, PolicyUpdate
from routers.auth import get_current_user

router = APIRouter()

def format_policy(d):
    return {
        "id": str(d["_id"]),
        "client_id": d.get("client_id", ""),
        "ramo": d.get("ramo", ""),
        "aseguradora": d.get("aseguradora", ""),
        "num_poliza": d.get("num_poliza", ""),
        "prima_anual": d.get("prima_anual", 0),
        "fecha_efecto": d.get("fecha_efecto", ""),
        "fecha_renovacion": d.get("fecha_renovacion", ""),
        "estado_tramite": d.get("estado_tramite", "Nuevo"),
        "estado_poliza": d.get("estado_poliza", ""),
        "notas": d.get("notas", ""),
        "created_at": d.get("created_at", ""),
        "updated_at": d.get("updated_at", ""),
    }

@router.get("/client/{client_id}")
async def get_policies_by_client(client_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    docs = await db["policies"].find({"client_id": client_id}).sort("created_at", -1).to_list(100)
    return [format_policy(d) for d in docs]

@router.get("")
async def get_all_policies(request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    if current_user["role"] == "admin":
        docs = await db["policies"].find().sort("fecha_renovacion", 1).to_list(1000)
    else:
        # Obtener solo pólizas de clientes asignados al usuario
        clients = await db["clients"].find({"assigned_to_id": str(current_user["_id"])}).to_list(1000)
        client_ids = [str(c["_id"]) for c in clients]
        docs = await db["policies"].find({"client_id": {"$in": client_ids}}).sort("fecha_renovacion", 1).to_list(1000)
    return [format_policy(d) for d in docs]

@router.post("")
async def create_policy(request: Request, body: PolicyCreate, current_user=Depends(get_current_user)):
    db = request.app.db
    now = datetime.now(timezone.utc).isoformat()
    doc = body.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    result = await db["policies"].insert_one(doc)
    # Actualizar updated_at del cliente
    await db["clients"].update_one(
        {"_id": ObjectId(body.client_id)},
        {"$set": {"updated_at": now}}
    )
    created = await db["policies"].find_one({"_id": result.inserted_id})
    return format_policy(created)

@router.put("/{policy_id}")
async def update_policy(policy_id: str, request: Request, body: PolicyUpdate, current_user=Depends(get_current_user)):
    db = request.app.db
    policy = await db["policies"].find_one({"_id": ObjectId(policy_id)})
    if not policy:
        raise HTTPException(404, "Póliza no encontrada")
    doc = body.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db["policies"].update_one({"_id": ObjectId(policy_id)}, {"$set": doc})
    updated = await db["policies"].find_one({"_id": ObjectId(policy_id)})
    return format_policy(updated)

@router.delete("/{policy_id}")
async def delete_policy(policy_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    await db["policies"].delete_one({"_id": ObjectId(policy_id)})
    return {"message": "Póliza eliminada"}
