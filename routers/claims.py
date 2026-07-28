from fastapi import APIRouter, HTTPException, Request, Depends
from bson import ObjectId, errors as bson_errors
from datetime import datetime, timezone
from models.claim import ClaimCreate, ClaimUpdate
from routers.auth import get_current_user
from routers.audit import log_action

router = APIRouter()

MAX_NOTE_LENGTH = 2000

def valid_oid(id: str):
    try:
        return ObjectId(id)
    except (bson_errors.InvalidId, Exception):
        raise HTTPException(400, "ID inválido")

def format_claim(d):
    return {
        "id": str(d["_id"]),
        "client_id": d.get("client_id", ""),
        "policy_id": d.get("policy_id", ""),
        "ramo": d.get("ramo", ""),
        "aseguradora": d.get("aseguradora", ""),
        "num_expediente": d.get("num_expediente", ""),
        "fecha_siniestro": d.get("fecha_siniestro", ""),
        "descripcion": d.get("descripcion", ""),
        "estado": d.get("estado", "Abierto"),
        "resolucion": d.get("resolucion", ""),
        "notas": d.get("notas", ""),
        "activities": d.get("activities", []),
        "created_at": d.get("created_at", ""),
        "updated_at": d.get("updated_at", ""),
    }

@router.get("/client/{client_id}")
async def get_claims_by_client(client_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    docs = await db["claims"].find({"client_id": client_id}).sort("created_at", -1).to_list(100)
    return [format_claim(d) for d in docs]

@router.get("")
async def get_all_claims(request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    docs = await db["claims"].find().sort("created_at", -1).to_list(1000)
    return [format_claim(d) for d in docs]

@router.post("")
async def create_claim(request: Request, body: ClaimCreate, current_user=Depends(get_current_user)):
    db = request.app.db
    now = datetime.now(timezone.utc).isoformat()
    doc = body.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["activities"] = []
    result = await db["claims"].insert_one(doc)
    await db["clients"].update_one(
        {"_id": valid_oid(body.client_id)},
        {"$set": {"updated_at": now}}
    )
    created = await db["claims"].find_one({"_id": result.inserted_id})
    return format_claim(created)

@router.put("/{claim_id}")
async def update_claim(claim_id: str, request: Request, body: ClaimUpdate, current_user=Depends(get_current_user)):
    db = request.app.db
    claim = await db["claims"].find_one({"_id": valid_oid(claim_id)})
    if not claim:
        raise HTTPException(404, "Siniestro no encontrado")
    doc = body.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db["claims"].update_one({"_id": valid_oid(claim_id)}, {"$set": doc})
    updated = await db["claims"].find_one({"_id": valid_oid(claim_id)})
    return format_claim(updated)

@router.delete("/{claim_id}")
async def delete_claim(claim_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    await db["claims"].delete_one({"_id": valid_oid(claim_id)})
    return {"message": "Siniestro eliminado"}

@router.post("/{claim_id}/activity")
async def add_claim_activity(claim_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    data = await request.json()
    note = str(data.get("note", ""))[:MAX_NOTE_LENGTH]
    activity = {
        "id": str(ObjectId()),
        "date": datetime.now(timezone.utc).isoformat(),
        "user": current_user["name"],
        "note": note,
    }
    await db["claims"].update_one(
        {"_id": valid_oid(claim_id)},
        {"$push": {"activities": activity}, "$set": {"updated_at": activity["date"]}}
    )
    return activity
