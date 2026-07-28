from fastapi import APIRouter, HTTPException, Request, Depends
from bson import ObjectId
from datetime import datetime, timezone
from models.client import ClientCreate, ClientUpdate
from routers.auth import get_current_user
from encrypt import encrypt_client, decrypt_client

router = APIRouter()

def format_client(d):
    dec = decrypt_client(d)
    return {
        "id": str(d["_id"]),
        "name": dec.get("name", ""),
        "dni": dec.get("dni", ""),
        "email": dec.get("email", ""),
        "phone": dec.get("phone", ""),
        "address": dec.get("address", ""),
        "birth_date": dec.get("birth_date", ""),
        "tipo": dec.get("tipo", "Particular"),
        "empresa": dec.get("empresa", ""),
        "notas": dec.get("notas", ""),
        "assigned_to": dec.get("assigned_to", ""),
        "assigned_to_id": dec.get("assigned_to_id", ""),
        "activities": dec.get("activities", []),
        "tesis_policies": dec.get("tesis_policies", []),
        "tesis_claims": dec.get("tesis_claims", []),
        "created_at": dec.get("created_at", ""),
        "updated_at": dec.get("updated_at", ""),
    }

@router.get("")
async def get_clients(request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    docs = await db["clients"].find().sort("name", 1).to_list(1000)
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
    doc = encrypt_client(doc)
    result = await db["clients"].insert_one(doc)
    created = await db["clients"].find_one({"_id": result.inserted_id})
    return format_client(created)

@router.post("/gestiones-libres")
async def add_gestion_libre(request: Request, current_user=Depends(get_current_user)):
    db   = request.app.db
    data = await request.json()
    now  = datetime.now(timezone.utc).isoformat()
    doc  = {
        "id":      str(ObjectId()),
        "date":    now,
        "user":    current_user["name"],
        "cliente": str(data.get("cliente", ""))[:200],
        "note":    str(data.get("note", ""))[:2000],
        "tipo":    str(data.get("tipo", "Otro"))[:50],
    }
    await db["gestiones_libres"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/gestiones-libres")
async def get_gestiones_libres(request: Request, fecha: str = "", current_user=Depends(get_current_user)):
    db    = request.app.db
    query = {"date": {"$regex": f"^{fecha}"}} if fecha else {}
    docs  = await db["gestiones_libres"].find(query).sort("date", -1).to_list(500)
    for d in docs:
        d.pop("_id", None)
    return docs

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
    doc = encrypt_client(doc)
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

@router.delete("/gestiones-libres/{gestion_id}")
async def delete_gestion_libre(gestion_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    await db["gestiones_libres"].delete_one({"id": gestion_id})
    return {"message": "Eliminada"}

@router.patch("/gestiones-libres/{gestion_id}")
async def update_gestion_libre(gestion_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    data = await request.json()
    campos = {}
    if "cliente" in data: campos["cliente"] = str(data["cliente"])[:200]
    if "note"    in data: campos["note"]    = str(data["note"])[:2000]
    if "tipo"    in data: campos["tipo"]    = str(data["tipo"])[:50]
    if "estado"  in data: campos["estado"]  = data["estado"]
    if campos:
        await db["gestiones_libres"].update_one({"id": gestion_id}, {"$set": campos})
    return {"message": "Actualizada"}

@router.patch("/{client_id}/activity/{activity_id}")
async def update_activity(client_id: str, activity_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    data = await request.json()
    campos = {}
    if "note"   in data: campos["activities.$.note"]   = str(data["note"])[:2000]
    if "estado" in data: campos["activities.$.estado"] = data["estado"]
    if campos:
        await db["clients"].update_one(
            {"_id": ObjectId(client_id), "activities.id": activity_id},
            {"$set": campos}
        )
    return {"message": "Actualizada"}
