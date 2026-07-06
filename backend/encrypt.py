from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv
load_dotenv()

_key = os.getenv("ENCRYPTION_KEY")
_f   = Fernet(_key.encode()) if _key else None

FIELDS_TO_ENCRYPT = ["dni", "email", "phone", "address", "birth_date"]

def encrypt(value: str) -> str:
    if not value or not _f:
        return value
    return _f.encrypt(value.encode()).decode()

def decrypt(value: str) -> str:
    if not value or not _f:
        return value
    try:
        return _f.decrypt(value.encode()).decode()
    except Exception:
        return value  # ya estaba sin encriptar

def encrypt_client(doc: dict) -> dict:
    result = dict(doc)
    for field in FIELDS_TO_ENCRYPT:
        if result.get(field):
            result[field] = encrypt(result[field])
    return result

def decrypt_client(doc: dict) -> dict:
    result = dict(doc)
    for field in FIELDS_TO_ENCRYPT:
        if result.get(field):
            result[field] = decrypt(result[field])
    return result
