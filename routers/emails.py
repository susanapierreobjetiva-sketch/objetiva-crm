from fastapi import APIRouter, Request, Depends
from models.email import EmailCreate
from routers.auth import get_current_user
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()

def fix(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.post("")
async def create_email(request: Request, body: EmailCreate, current_user=Depends(get_current_user)):
    doc = body.dict()
    doc["fecha"] = datetime.now(timezone.utc).isoformat()
    doc["agente"] = current_user.get("username", "")
    result = await request.app.db["emails"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@router.get("")
async def get_emails(entity_type: str, entity_id: str, request: Request, current_user=Depends(get_current_user)):
    cursor = request.app.db["emails"].find(
        {"entity_type": entity_type, "entity_id": entity_id}
    ).sort("fecha", -1)
    docs = []
    async for d in cursor:
        d["id"] = str(d["_id"])
        del d["_id"]
        docs.append(d)
    return docs

@router.delete("/{email_id}")
async def delete_email(email_id: str, request: Request, current_user=Depends(get_current_user)):
    await request.app.db["emails"].delete_one({"_id": ObjectId(email_id)})
    return {"deleted": email_id}
