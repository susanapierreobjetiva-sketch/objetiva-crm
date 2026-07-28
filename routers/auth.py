from fastapi import APIRouter, HTTPException, Response, Request, Depends
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from models.user import LoginRequest, Token, UserPublic
import bcrypt, os, secrets
from dotenv import load_dotenv
from security import check_rate_limit, record_failed_attempt, clear_attempts, log_audit

load_dotenv()

router = APIRouter()

SECRET_KEY          = os.getenv('SECRET_KEY')
ALGORITHM           = os.getenv('ALGORITHM')
ACCESS_EXPIRE_MIN   = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 60))
REFRESH_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', 7))

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MIN)
    return jwt.encode({'sub': user_id, 'exp': expire, 'type': 'access'}, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE_DAYS)
    jti = secrets.token_hex(16)
    return jwt.encode({'sub': user_id, 'exp': expire, 'type': 'refresh', 'jti': jti}, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain, hashed):
    return bcrypt.checkpw(plain.encode(), hashed.encode())

async def get_current_user(request: Request):
    token = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get('access_token')
    if not token:
        raise HTTPException(status_code=401, detail='No autenticado')
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get('type') != 'access':
            raise HTTPException(status_code=401, detail='Token inválido')
        user_id = payload.get('sub')
    except JWTError:
        raise HTTPException(status_code=401, detail='Token expirado o inválido')

    users_db = request.app.mongodb_client['objetiva_vault']
    user = await users_db['users'].find_one({'_id': ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail='Usuario no encontrado')

    if user.get('locked_until'):
        locked_until = datetime.fromisoformat(user['locked_until'])
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail='Cuenta bloqueada temporalmente')

    return user

@router.post('/login')
async def login(request: Request, response: Response, body: LoginRequest):
    ip = request.client.host
    check_rate_limit(ip)

    users_db = request.app.mongodb_client['objetiva_vault']
    user = await users_db['users'].find_one({'email': body.email})

    if not user or not verify_password(body.password, user['hashed_password']):
        record_failed_attempt(ip)
        if user:
            failed = user.get('failed_login_attempts', 0) + 1
            update_data = {
                'failed_login_attempts': failed,
                'last_failed_login': datetime.now(timezone.utc).isoformat()
            }
            if failed >= 10:
                update_data['locked_until'] = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
            await users_db['users'].update_one(
                {'_id': user['_id']},
                {'$set': update_data}
            )
        raise HTTPException(status_code=401, detail='Credenciales incorrectas')

    clear_attempts(ip)

    user_id = str(user['_id'])
    access_token  = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    await users_db['users'].update_one(
        {'_id': user['_id']},
        {'$set': {
            'crm_refresh_token': refresh_token,
            'failed_login_attempts': 0,
            'locked_until': None,
            'last_login': datetime.now(timezone.utc).isoformat()
        }}
    )

    # Si tiene 2FA activo, devolver temp_token en lugar de access_token
    if user.get('totp_enabled'):
        temp_token = secrets.token_hex(32)
        await users_db['users'].update_one(
            {'_id': user['_id']},
            {'$set': {'totp_temp_token': temp_token}}
        )
        return {'requires_2fa': True, 'temp_token': temp_token}

    await log_audit(request.app.db, 'LOGIN', user_id, {
        'email': body.email,
        'ip': ip,
        'user_agent': request.headers.get('user-agent', '')[:100]
    })

    response.set_cookie(
        key='crm_refresh_token', value=refresh_token,
        httponly=True, samesite='lax', secure=True,
        max_age=REFRESH_EXPIRE_DAYS * 86400,
    )

    return Token(
        access_token=access_token,
        token_type='bearer',
        user=UserPublic(
            id=user_id,
            name=user['name'],
            email=user['email'],
            role=user['role'],
            avatar=user['avatar'],
            color=user['color'],
            dept=user['dept'],
            theme=user.get('theme', 'dark'),
        )
    )

@router.post('/refresh')
async def refresh(request: Request, response: Response):
    token = request.cookies.get('crm_refresh_token')
    if not token:
        raise HTTPException(status_code=401, detail='No hay refresh token')
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get('type') != 'refresh':
            raise HTTPException(status_code=401, detail='Token inválido')
        user_id = payload.get('sub')
    except JWTError:
        raise HTTPException(status_code=401, detail='Refresh token expirado')

    users_db = request.app.mongodb_client['objetiva_vault']
    user = await users_db['users'].find_one({'_id': ObjectId(user_id)})
    if not user or user.get('crm_refresh_token') != token:
        raise HTTPException(status_code=401, detail='Token revocado')

    new_access  = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)

    await users_db['users'].update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'crm_refresh_token': new_refresh}}
    )

    response.set_cookie(
        key='crm_refresh_token', value=new_refresh,
        httponly=True, samesite='lax', secure=True,
        max_age=REFRESH_EXPIRE_DAYS * 86400,
    )
    return {'access_token': new_access, 'token_type': 'bearer'}

@router.post('/logout')
async def logout(request: Request, response: Response):
    token = request.cookies.get('crm_refresh_token')
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get('sub')
            users_db = request.app.mongodb_client['objetiva_vault']
            await users_db['users'].update_one(
                {'_id': ObjectId(user_id)},
                {'$unset': {'crm_refresh_token': ''}}
            )
            await log_audit(request.app.db, 'LOGOUT', user_id, {'ip': request.client.host})
        except Exception:
            pass
    response.delete_cookie('crm_refresh_token')
    return {'message': 'Sesión cerrada'}

@router.get('/audit')
async def get_audit_log(request: Request, current_user=Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Sin permisos')
    logs = await request.app.db['audit_log'].find({}).sort('timestamp', -1).limit(200).to_list(200)
    for l in logs:
        l['_id'] = str(l['_id'])
    return logs


@router.put("/profile")
async def update_profile(request: Request, current_user=Depends(get_current_user)):
    body     = await request.json()
    users_db = request.app.mongodb_client["objetiva_vault"]
    update   = {}
    if "name" in body: update["name"] = body["name"]
    if "dept" in body: update["dept"] = body["dept"]
    if update:
        await users_db["users"].update_one(
            {"_id": current_user["_id"]},
            {"$set": update}
        )
    return {"message": "Perfil actualizado"}

@router.post("/change-password")
async def change_password(request: Request, current_user=Depends(get_current_user)):
    body = await request.json()
    current_password = body.get("current_password", "")
    new_password     = body.get("new_password", "")

    if not verify_password(current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Mínimo 8 caracteres")

    import bcrypt as _bcrypt
    hashed = _bcrypt.hashpw(new_password.encode(), _bcrypt.gensalt()).decode()
    users_db = request.app.mongodb_client["objetiva_vault"]
    await users_db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": hashed}}
    )
    await log_audit(request.app.db, "PASSWORD_CHANGED", str(current_user["_id"]), {
        "ip": request.client.host
    })
    return {"message": "Contraseña actualizada"}


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return UserPublic(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        avatar=current_user["avatar"],
        color=current_user["color"],
        dept=current_user["dept"],
        theme=current_user.get("theme", "dark"),
    )
# Añadir este endpoint a routers/auth.py

@router.get("/users")
async def get_users(request: Request, current_user=Depends(get_current_user)):
    """Lista de agentes — solo admin. Nunca expone passwords ni tokens."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    users_db = request.app.mongodb_client["objetiva_vault"]
    docs = await users_db["users"].find(
        {},
        {"_id": 1, "name": 1, "email": 1, "role": 1, "dept": 1, "avatar": 1, "color": 1}
    ).to_list(100)
    return [{"id": str(d["_id"]), "name": d.get("name", ""), "email": d.get("email", ""),
             "role": d.get("role", ""), "dept": d.get("dept", "")} for d in docs]
