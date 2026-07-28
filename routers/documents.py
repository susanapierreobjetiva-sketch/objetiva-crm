from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from routers.auth import get_current_user
from datetime import datetime, timezone
from bson import ObjectId
import os, mimetypes, logging

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.path.realpath("/root/crm-backend/uploads")
MAX_SIZE   = 10 * 1024 * 1024  # 10 MB

# Magic bytes para los tipos permitidos
MAGIC: dict[bytes, str] = {
    b"%PDF":                          "application/pdf",
    b"\xff\xd8\xff":                  "image/jpeg",
    b"\x89PNG\r\n\x1a\n":            "image/png",
    b"RIFF":                          "image/webp",   # se refina abajo
    b"\xd0\xcf\x11\xe0\xa1\xb1\x1a": "application/msword",
    b"PK\x03\x04":                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

ALLOWED_TYPES = set(MAGIC.values())


def detect_mime(data: bytes) -> str | None:
    for magic, mime in MAGIC.items():
        if data[:len(magic)] == magic:
            if mime == "image/webp" and data[8:12] != b"WEBP":
                continue
            return mime
    return None


def safe_path(entity_type: str, entity_id: str, filename: str) -> str:
    """Construye el path y verifica que esté dentro de UPLOAD_DIR."""
    # Sanear componentes: solo alfanuméricos, guiones y puntos
    for part in (entity_type, entity_id, filename):
        if not part or "/" in part or "\\" in part or ".." in part:
            raise HTTPException(400, "Parámetro de ruta inválido")
    path = os.path.realpath(os.path.join(UPLOAD_DIR, entity_type, entity_id, filename))
    if not path.startswith(UPLOAD_DIR + os.sep):
        raise HTTPException(400, "Ruta fuera del directorio permitido")
    return path


@router.post("")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: str   = Form(...),
    description: str = Form(""),
    current_user=Depends(get_current_user),
):
    db = request.app.db

    contents = await file.read()

    # Validar tamaño
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "El fichero supera el límite de 10 MB.")

    # Validar tipo por magic bytes (no confiar en Content-Type del cliente)
    real_mime = detect_mime(contents)
    if real_mime not in ALLOWED_TYPES:
        raise HTTPException(400, "Tipo de fichero no permitido. Solo PDF, imágenes y Word.")

    # Construir path seguro
    doc_id   = str(ObjectId())
    ext      = os.path.splitext(file.filename or "")[1] or mimetypes.guess_extension(real_mime) or ""
    filename = f"{doc_id}{ext}"
    folder   = os.path.realpath(os.path.join(UPLOAD_DIR, entity_type, entity_id))

    if not folder.startswith(UPLOAD_DIR + os.sep):
        raise HTTPException(400, "Entidad inválida")

    os.makedirs(folder, exist_ok=True)
    filepath = safe_path(entity_type, entity_id, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    doc = {
        "_id":              ObjectId(doc_id),
        "entity_type":      entity_type,
        "entity_id":        entity_id,
        "original_name":    file.filename,
        "filename":         filename,
        "content_type":     real_mime,
        "size":             len(contents),
        "description":      description[:500],
        "uploaded_by":      str(current_user["_id"]),
        "uploaded_by_name": current_user.get("name", ""),
        "created_at":       datetime.now(timezone.utc).isoformat(),
    }
    await db["documents"].insert_one(doc)

    return {
        "id":               doc_id,
        "original_name":    file.filename,
        "description":      doc["description"],
        "size":             len(contents),
        "content_type":     real_mime,
        "created_at":       doc["created_at"],
        "uploaded_by_name": doc["uploaded_by_name"],
    }


@router.get("/{entity_type}/{entity_id}")
async def get_documents(
    entity_type: str,
    entity_id: str,
    request: Request,
    current_user=Depends(get_current_user),
):
    db   = request.app.db
    docs = await db["documents"].find({
        "entity_type": entity_type,
        "entity_id":   entity_id,
    }).sort("created_at", -1).to_list(100)

    return [{
        "id":               str(d["_id"]),
        "original_name":    d.get("original_name", ""),
        "description":      d.get("description", ""),
        "size":             d.get("size", 0),
        "content_type":     d.get("content_type", ""),
        "created_at":       d.get("created_at", ""),
        "uploaded_by_name": d.get("uploaded_by_name", ""),
    } for d in docs]


@router.get("/file/{doc_id}")
async def download_document(
    doc_id: str,
    request: Request,
    current_user=Depends(get_current_user),
):
    db = request.app.db
    try:
        doc = await db["documents"].find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(400, "ID inválido")

    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    filepath = safe_path(doc["entity_type"], doc["entity_id"], doc["filename"])

    if not os.path.exists(filepath):
        raise HTTPException(404, "Fichero no encontrado en servidor")

    return FileResponse(
        filepath,
        media_type=doc.get("content_type", "application/octet-stream"),
        filename=doc.get("original_name", doc["filename"]),
    )


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    request: Request,
    current_user=Depends(get_current_user),
):
    db = request.app.db
    try:
        doc = await db["documents"].find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(400, "ID inválido")

    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    if current_user["role"] != "admin" and str(current_user["_id"]) != doc.get("uploaded_by"):
        raise HTTPException(403, "Sin permisos para eliminar este documento")

    filepath = safe_path(doc["entity_type"], doc["entity_id"], doc["filename"])
    if os.path.exists(filepath):
        os.remove(filepath)

    await db["documents"].delete_one({"_id": ObjectId(doc_id)})
    return {"ok": True}
