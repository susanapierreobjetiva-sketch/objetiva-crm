import pyotp
import qrcode
import base64
from io import BytesIO
from fastapi import APIRouter, HTTPException, Request, Depends, Response
from routers.auth import get_current_user, create_access_token, create_refresh_token, REFRESH_EXPIRE_DAYS, log_audit
from bson import ObjectId
from datetime import datetime, timezone
from models.user import UserPublic
import secrets

router = APIRouter()

def generate_totp_secret():
    return pyotp.random_base32()

def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)

def generate_qr_base64(secret: str, email: str) -> str:
    totp = pyotp.TOTP(secret)
    uri  = totp.provisioning_uri(name=email, issuer_name="OBJCRM · Objetiva Broker")
    img  = qrcode.make(uri)
    buf  = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

@router.post("/2fa/setup")
async def setup_2fa(request: Request, current_user=Depends(get_current_user)):
    users_db = request.app.mongodb_client["objetiva_vault"]
    secret   = generate_totp_secret()
    qr_b64   = generate_qr_base64(secret, current_user["email"])
    await users_db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": {"totp_secret_pending": secret}}
    )
    return {"qr": qr_b64, "secret": secret}

@router.post("/2fa/verify-setup")
async def verify_setup(request: Request, current_user=Depends(get_current_user)):
    body     = await request.json()
    code     = body.get("code", "")
    users_db = request.app.mongodb_client["objetiva_vault"]
    user     = await users_db["users"].find_one({"_id": current_user["_id"]})
    secret   = user.get("totp_secret_pending")
    if not secret or not verify_totp(secret, code):
        raise HTTPException(status_code=400, detail="Código incorrecto")
    backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]
    await users_db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": {"totp_secret": secret, "totp_enabled": True, "totp_backup_codes": backup_codes},
         "$unset": {"totp_secret_pending": ""}}
    )
    await log_audit(request.app.db, "2FA_ENABLED", str(current_user["_id"]), {"ip": request.client.host})
    return {"backup_codes": backup_codes}

@router.post("/2fa/disable")
async def disable_2fa(request: Request, current_user=Depends(get_current_user)):
    body     = await request.json()
    code     = body.get("code", "")
    users_db = request.app.mongodb_client["objetiva_vault"]
    user     = await users_db["users"].find_one({"_id": current_user["_id"]})
    secret   = user.get("totp_secret")
    if not secret or not verify_totp(secret, code):
        raise HTTPException(status_code=400, detail="Código incorrecto")
    await users_db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"totp_secret": "", "totp_enabled": "", "totp_backup_codes": ""}}
    )
    await log_audit(request.app.db, "2FA_DISABLED", str(current_user["_id"]), {"ip": request.client.host})
    return {"message": "2FA desactivado"}

@router.post("/2fa/validate")
async def validate_2fa(request: Request, response: Response):
    body       = await request.json()
    temp_token = body.get("temp_token", "")
    code       = body.get("code", "")

    users_db = request.app.mongodb_client["objetiva_vault"]
    user     = await users_db["users"].find_one({"totp_temp_token": temp_token})

    if not user:
        raise HTTPException(status_code=401, detail="Token inválido")

    secret = user.get("totp_secret")
    valid  = verify_totp(secret, code)

    if not valid:
        backup_codes = user.get("totp_backup_codes", [])
        if code.upper() in backup_codes:
            valid = True
            backup_codes.remove(code.upper())
            await users_db["users"].update_one(
                {"_id": user["_id"]},
                {"$set": {"totp_backup_codes": backup_codes}}
            )

    if not valid:
        raise HTTPException(status_code=401, detail="Código 2FA incorrecto")

    await users_db["users"].update_one(
        {"_id": user["_id"]},
        {"$unset": {"totp_temp_token": ""}}
    )

    user_id       = str(user["_id"])
    access_token  = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    await users_db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"crm_refresh_token": refresh_token}}
    )

    response.set_cookie(
        key="crm_refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=REFRESH_EXPIRE_DAYS * 86400,
    )

    await log_audit(request.app.db, "LOGIN_2FA", user_id, {"ip": request.client.host})

    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "user": UserPublic(
            id=user_id,
            name=user["name"],
            email=user["email"],
            role=user["role"],
            avatar=user["avatar"],
            color=user["color"],
            dept=user["dept"],
            theme=user.get("theme", "dark"),
        )
    }

@router.post("/2fa/send-email")
async def send_email_backup(request: Request):
    body       = await request.json()
    temp_token = body.get("temp_token", "")
    users_db   = request.app.mongodb_client["objetiva_vault"]
    user       = await users_db["users"].find_one({"totp_temp_token": temp_token})
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido")
    code = secrets.randbelow(900000) + 100000
    await users_db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"email_2fa_code": str(code), "email_2fa_expires": (datetime.now(timezone.utc).timestamp() + 600)}}
    )
    return {"message": f"Código enviado a {user['email']}", "debug_code": str(code)}
