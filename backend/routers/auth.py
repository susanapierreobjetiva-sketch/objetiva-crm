from fastapi import APIRouter, HTTPException, Response, Request, Depends
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from models.user import LoginRequest, Token, UserPublic
import bcrypt, os, secrets
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SECRET_KEY          = os.getenv("SECRET_KEY")
ALGORITHM           = os.getenv("ALGORITHM")
ACCESS_EXPIRE_MIN   = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MIN)
    return jwt.encode({"sub": user_id, "exp": expire, "type": "access"}, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE_DAYS)
    jti = secrets.token_hex(16)
    return jwt.encode({"sub": user_id, "exp": expire, "type": "refresh", "jti": jti}, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain, hashed):
    return bcrypt.checkpw(plain.encode(), hashed.encode())

async def get_current_user(request: Request):
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expirado o inválido")

    # Buscar usuario en la BD de Clavex (usuarios compartidos)
    users_db = request.app.mongodb_client["objetiva_vault"]
    user = await users_db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

@router.post("/login")
async def login(request: Request, response: Response, body: LoginRequest):
    users_db = request.app.mongodb_client["objetiva_vault"]
    user = await users_db["users"].find_one({"email": body.email})
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    user_id = str(user["_id"])
    access_token  = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    await users_db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"crm_refresh_token": refresh_token}}
    )

    response.set_cookie(
        key="crm_refresh_token", value=refresh_token,
        httponly=True, samesite="lax", secure=False,
        max_age=REFRESH_EXPIRE_DAYS * 86400,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserPublic(
            id=user_id,
            name=user["name"],
            email=user["email"],
            role=user["role"],
            avatar=user["avatar"],
            color=user["color"],
            dept=user["dept"],
            theme=user.get("theme", "dark"),
        )
    )

@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("crm_refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No hay refresh token")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token expirado")

    users_db = request.app.mongodb_client["objetiva_vault"]
    user = await users_db["users"].find_one({"_id": ObjectId(user_id)})
    if not user or user.get("crm_refresh_token") != token:
        raise HTTPException(status_code=401, detail="Token revocado")

    new_access  = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)

    await users_db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"crm_refresh_token": new_refresh}}
    )

    response.set_cookie(
        key="crm_refresh_token", value=new_refresh,
        httponly=True, samesite="lax", secure=False,
        max_age=REFRESH_EXPIRE_DAYS * 86400,
    )
    return {"access_token": new_access, "token_type": "bearer"}

@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("crm_refresh_token")
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            users_db = request.app.mongodb_client["objetiva_vault"]
            await users_db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {"$unset": {"crm_refresh_token": ""}}
            )
        except Exception:
            pass
    response.delete_cookie("crm_refresh_token")
    return {"message": "Sesión cerrada"}
