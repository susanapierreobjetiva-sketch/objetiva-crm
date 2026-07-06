from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from routers.auth import get_current_user
from fastapi.responses import FileResponse
from datetime import datetime, timezone
from bson import ObjectId
import os, json, gzip

router = APIRouter()

BACKUP_DIR = "/root/crm-backups"
os.makedirs(BACKUP_DIR, exist_ok=True)

COLLECTIONS = ["clients", "policies", "claims", "tasks", "documents", "audit_logs"]

def serialize_doc(doc: dict) -> dict:
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = serialize_doc(v)
        elif isinstance(v, list):
            result[k] = [serialize_doc(i) if isinstance(i, dict) else str(i) if isinstance(i, ObjectId) else i for i in v]
        else:
            result[k] = v
    return result

async def require_admin(request: Request):
    from routers.auth import get_current_user
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return user

@router.get("/export")
async def export_backup(request: Request, _=Depends(get_current_user)):
    db = request.app.db
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"crm_backup_{timestamp}.json.gz"
    filepath = os.path.join(BACKUP_DIR, filename)
    data = {
        "meta": {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "version": "1.0",
            "collections": COLLECTIONS
        }
    }
    for col in COLLECTIONS:
        docs = []
        async for doc in db[col].find():
            docs.append(serialize_doc(doc))
        data[col] = docs
    with gzip.open(filepath, "wt", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    await db["audit_logs"].insert_one({
        "user": "admin",
        "action": "Copia de seguridad exportada",
        "item": filename,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return FileResponse(path=filepath, media_type="application/gzip", filename=filename)

@router.get("/list")
async def list_backups(_=Depends(get_current_user)):
    files = []
    if os.path.exists(BACKUP_DIR):
        for fname in sorted(os.listdir(BACKUP_DIR), reverse=True):
            if fname.endswith(".json.gz"):
                fpath = os.path.join(BACKUP_DIR, fname)
                stat = os.stat(fpath)
                files.append({
                    "filename": fname,
                    "size_kb": round(stat.st_size / 1024, 1),
                    "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
                })
    return {"backups": files}

@router.delete("/{filename}")
async def delete_backup(filename: str, request: Request, _=Depends(get_current_user)):
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup no encontrado")
    os.remove(filepath)
    await request.app.db["audit_logs"].insert_one({
        "user": "admin",
        "action": "Backup eliminado",
        "item": filename,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"ok": True}

@router.post("/restore")
async def restore_backup(request: Request, file: UploadFile = File(...), _=Depends(get_current_user)):
    if not file.filename.endswith(".json.gz"):
        raise HTTPException(status_code=400, detail="El archivo debe ser .json.gz")
    content = await file.read()
    try:
        data = json.loads(gzip.decompress(content).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Archivo de backup inválido o corrupto")
    db = request.app.db
    restored = {}
    for col in COLLECTIONS:
        if col not in data:
            continue
        docs = data[col]
        if not docs:
            restored[col] = 0
            continue
        clean_docs = []
        for doc in docs:
            if "_id" in doc:
                try:
                    doc["_id"] = ObjectId(doc["_id"])
                except Exception:
                    doc.pop("_id", None)
            if "id" in doc and "_id" not in doc:
                try:
                    doc["_id"] = ObjectId(doc["id"])
                except Exception:
                    pass
                doc.pop("id", None)
            clean_docs.append(doc)
        for doc in clean_docs:
            if "_id" in doc:
                await db[col].replace_one({"_id": doc["_id"]}, doc, upsert=True)
            else:
                await db[col].insert_one(doc)
        restored[col] = len(clean_docs)
    await db["audit_logs"].insert_one({
        "user": "admin",
        "action": "Backup restaurado",
        "item": file.filename,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": restored
    })
    return {"ok": True, "restored": restored}
