from pydantic import BaseModel
from typing import Optional, List

class ClientCreate(BaseModel):
    # Datos personales
    name: str
    dni: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    birth_date: Optional[str] = None
    # Clasificación
    tipo: Optional[str] = "Particular"  # Particular / Empresa
    empresa: Optional[str] = ""
    notas: Optional[str] = ""
    assigned_to: Optional[str] = ""
    assigned_to_id: Optional[str] = ""

class ClientUpdate(ClientCreate):
    pass
