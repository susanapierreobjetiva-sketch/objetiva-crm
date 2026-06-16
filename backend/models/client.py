from pydantic import BaseModel
from typing import Optional, List

class Contact(BaseModel):
    name: str
    role: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""

class TesisPolicy(BaseModel):
    ramo: Optional[str] = ""
    aseguradora: Optional[str] = ""
    num_poliza: Optional[str] = ""
    prima_anual: Optional[float] = 0
    fecha_efecto: Optional[str] = ""
    fecha_vencimiento: Optional[str] = ""
    estado: Optional[str] = ""
    notas: Optional[str] = ""

class TesisClaim(BaseModel):
    ramo: Optional[str] = ""
    aseguradora: Optional[str] = ""
    num_expediente: Optional[str] = ""
    fecha_siniestro: Optional[str] = ""
    descripcion: Optional[str] = ""
    resolucion: Optional[str] = ""
    importe: Optional[float] = 0
    estado: Optional[str] = "Cerrado"

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    dni: Optional[str] = ""
    birth_date: Optional[str] = None
    tipo: Optional[str] = "Particular"
    empresa: Optional[str] = ""
    notas: Optional[str] = ""
    assigned_to: Optional[str] = ""
    assigned_to_id: Optional[str] = ""
    tesis_policies: List[TesisPolicy] = []
    tesis_claims: List[TesisClaim] = []

class ClientUpdate(ClientCreate):
    pass
