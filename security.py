from fastapi import HTTPException
from datetime import datetime, timezone
import time
import logging
import os

logger = logging.getLogger(__name__)

# ── Rate limiting ─────────────────────────────────────────────
# Usa Redis si está disponible, fallback a memoria con advertencia.
MAX_ATTEMPTS   = 5
WINDOW_SECONDS = 300   # 5 minutos
BLOCK_SECONDS  = 900   # 15 minutos

try:
    import redis as _redis
    _r = _redis.Redis(
        host=os.getenv("REDIS_HOST", "127.0.0.1"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=0,
        decode_responses=True,
        socket_connect_timeout=2,
    )
    _r.ping()
    _REDIS_OK = True
    logger.info("Rate limiting: Redis activo")
except Exception:
    _REDIS_OK = False
    _login_attempts: dict = {}
    logger.warning(
        "Rate limiting: Redis no disponible — usando memoria. "
        "Los contadores se pierden al reiniciar el proceso."
    )


def _redis_check(ip: str) -> None:
    block_key  = f"rl:block:{ip}"
    count_key  = f"rl:count:{ip}"
    blocked_until = _r.get(block_key)
    if blocked_until:
        remaining = int(float(blocked_until) - time.time())
        if remaining > 0:
            raise HTTPException(
                status_code=429,
                detail=f"Demasiados intentos. Espera {remaining} segundos.",
            )


def _redis_record(ip: str) -> None:
    count_key = f"rl:count:{ip}"
    block_key = f"rl:block:{ip}"
    count = _r.incr(count_key)
    if count == 1:
        _r.expire(count_key, WINDOW_SECONDS)
    if count >= MAX_ATTEMPTS:
        _r.set(block_key, time.time() + BLOCK_SECONDS, ex=BLOCK_SECONDS)


def _redis_clear(ip: str) -> None:
    _r.delete(f"rl:count:{ip}", f"rl:block:{ip}")


def _mem_check(ip: str) -> None:
    now  = time.time()
    data = _login_attempts.get(ip, {})
    if data.get("blocked_until", 0) > now:
        remaining = int(data["blocked_until"] - now)
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos. Espera {remaining} segundos.",
        )
    if now - data.get("first_attempt", 0) > WINDOW_SECONDS:
        _login_attempts[ip] = {"count": 0, "first_attempt": now, "blocked_until": 0}


def _mem_record(ip: str) -> None:
    now  = time.time()
    data = _login_attempts.setdefault(ip, {"count": 0, "first_attempt": now, "blocked_until": 0})
    data["count"] += 1
    if data["count"] >= MAX_ATTEMPTS:
        data["blocked_until"] = now + BLOCK_SECONDS


def _mem_clear(ip: str) -> None:
    _login_attempts.pop(ip, None)


def check_rate_limit(ip: str) -> None:
    if _REDIS_OK:
        _redis_check(ip)
    else:
        _mem_check(ip)


def record_failed_attempt(ip: str) -> None:
    if _REDIS_OK:
        _redis_record(ip)
    else:
        _mem_record(ip)


def clear_attempts(ip: str) -> None:
    if _REDIS_OK:
        _redis_clear(ip)
    else:
        _mem_clear(ip)


# ── Auditoría ─────────────────────────────────────────────────
async def log_audit(db, action: str, user_id: str, details: dict = {}) -> None:
    try:
        await db["audit_log"].insert_one({
            "action":    action,
            "user_id":   user_id,
            "details":   details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error("audit log write failed action=%s user=%s err=%s", action, user_id, e)
