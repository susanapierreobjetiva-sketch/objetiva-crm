from fastapi import APIRouter, HTTPException, Request, Depends
from bson import ObjectId
from datetime import datetime, timezone
from models.client import ClientCreate, ClientUpdate
from routers.auth import get_current_user

router = APIRouter()

def format_client(d):
    return {
        "id": str(d["_id"]),
        "name": d.get("name", ""),
        "dni": d.get("dni", ""),
        "email": d.get("email", ""),
        "phone": d.get("phone", ""),
        "address": d.get("address", ""),
        "birth_date": d.get("birth_date", ""),
        "tipo": d.get("tipo", "Particular"),
        "empresa": d.get("empresa", ""),
        "notas": d.get("notas", ""),
        "assigned_to": d.get("assigned_to", ""),
        "assigned_to_id": d.get("assigned_to_id", ""),
        "activities": d.get("activities", []),
        "tesis_policies": d.get("tesis_policies", []),
        "tesis_claims": d.get("tesis_claims", []),
        "created_at": d.get("created_at", ""),
        "updated_at": d.get("updated_at", ""),
    }

@router.get("")
async def get_clients(request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    if current_user["role"] == "admin":
        docs = await db["clients"].find().sort("name", 1).to_list(1000)
    else:
        docs = await db["clients"].find({"assigned_to_id": str(current_user["_id"])}).sort("name", 1).to_list(1000)
    return [format_client(d) for d in docs]

@router.post("")
async def create_client(request: Request, body: ClientCreate, current_user=Depends(get_current_user)):
    db = request.app.db
    now = datetime.now(timezone.utc).isoformat()
    doc = body.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["activities"] = []
    if not doc.get("assigned_to_id"):
        doc["assigned_to_id"] = str(current_user["_id"])
        doc["assigned_to"] = current_user["name"]
    result = await db["clients"].insert_one(doc)
    created = await db["clients"].find_one({"_id": result.inserted_id})
    return format_client(created)

@router.get("/{client_id}")
async def get_client(client_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    client = await db["clients"].find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    return format_client(client)

@router.put("/{client_id}")
async def update_client(client_id: str, request: Request, body: ClientUpdate, current_user=Depends(get_current_user)):
    db = request.app.db
    client = await db["clients"].find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    if current_user["role"] != "admin" and client.get("assigned_to_id") != str(current_user["_id"]):
        raise HTTPException(403, "Sin permiso")
    doc = body.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db["clients"].update_one({"_id": ObjectId(client_id)}, {"$set": doc})
    updated = await db["clients"].find_one({"_id": ObjectId(client_id)})
    return format_client(updated)

@router.delete("/{client_id}")
async def delete_client(client_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    if current_user["role"] != "admin":
        raise HTTPException(403, "Solo el admin puede eliminar clientes")
    await db["clients"].delete_one({"_id": ObjectId(client_id)})
    await db["policies"].delete_many({"client_id": client_id})
    await db["claims"].delete_many({"client_id": client_id})
    return {"message": "Cliente y sus datos eliminados"}

@router.post("/{client_id}/activity")
async def add_activity(client_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    data = await request.json()
    activity = {
        "id": str(ObjectId()),
        "date": datetime.now(timezone.utc).isoformat(),
        "user": current_user["name"],
        "note": data.get("note", ""),
    }
    await db["clients"].update_one(
        {"_id": ObjectId(client_id)},
        {"$push": {"activities": activity}, "$set": {"updated_at": activity["date"]}}
    )
    return activity

@router.delete("/{client_id}/activity/{activity_id}")
async def delete_activity(client_id: str, activity_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    await db["clients"].update_one(
        {"_id": ObjectId(client_id)},
        {"$pull": {"activities": {"id": activity_id}}}
    )
    return {"message": "Actividad eliminada"}

# ── Tesis histórico ────────────────────────────────────────────

@router.post("/{client_id}/tesis-policy")
async def add_tesis_policy(client_id: str, request: Request, current_user=Depends(get_current_user)):
    db   = request.app.db
    data = await request.json()
    data["id"] = str(ObjectId())
    await db["clients"].update_one(
        {"_id": ObjectId(client_id)},
        {"$push": {"tesis_policies": data}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return data

@router.delete("/{client_id}/tesis-policy/{policy_id}")
async def delete_tesis_policy(client_id: str, policy_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    await db["clients"].update_one(
        {"_id": ObjectId(client_id)},
        {"$pull": {"tesis_policies": {"id": policy_id}}}
    )
    return {"message": "OK"}

@router.post("/{client_id}/tesis-claim")
async def add_tesis_claim(client_id: str, request: Request, current_user=Depends(get_current_user)):
    db   = request.app.db
    data = await request.json()
    data["id"] = str(ObjectId())
    await db["clients"].update_one(
        {"_id": ObjectId(client_id)},
        {"$push": {"tesis_claims": data}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return data

@router.delete("/{client_id}/tesis-claim/{claim_id}")
async def delete_tesis_claim(client_id: str, claim_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    await db["clients"].update_one(
        {"_id": ObjectId(client_id)},
        {"$pull": {"tesis_claims": {"id": claim_id}}}
    )
    return {"message": "OK"}
