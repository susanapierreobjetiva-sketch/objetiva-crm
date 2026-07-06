from fastapi import APIRouter, Request, Depends, HTTPException
from routers.auth import get_current_user
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_ip(request) -> str:
    """Extrae la IP real respetando el proxy de confianza (nginx en localhost)."""
    # Solo confiamos en X-Real-IP si viene del proxy local (ya configurado en nginx)
    # X-Forwarded-For NO se usa directamente — es spoofable por el cliente
    return (
        request.headers.get("X-Real-IP")
        or str(request.client.host)
    )


async def log_action(
    db,
    user,
    action: str,
    entity: str = "",
    entity_id: str = "",
    detail: str = "",
    request=None,
) -> None:
    try:
        ip = _get_ip(request) if request else ""
        await db["audit_log"].insert_one({
            "user_id":   str(user["_id"]),
            "user_name": user.get("name", ""),
            "action":    action,
            "entity":    entity,
            "entity_id": entity_id,
            "detail":    detail,
            "ip":        ip,
            "date":      datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error("audit log write failed action=%s user=%s err=%s", action, user.get("_id"), e)


@router.get("")
async def get_audit_log(request: Request, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Solo administradores")
    db   = request.app.db
    docs = await db["audit_log"].find().sort("date", -1).to_list(500)
    return [{
        "id":        str(d["_id"]),
        "user_name": d.get("user_name", ""),
        "action":    d.get("action", ""),
        "entity":    d.get("entity", ""),
        "entity_id": d.get("entity_id", ""),
        "detail":    d.get("detail", ""),
        "ip":        d.get("ip", ""),
        "date":      d.get("date", ""),
    } for d in docs]
