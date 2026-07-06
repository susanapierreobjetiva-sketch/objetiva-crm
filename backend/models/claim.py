from pydantic import BaseModel
from typing import Optional

class ClaimCreate(BaseModel):
    client_id: str
    policy_id: Optional[str] = ""
    # Datos del siniestro
    ramo: Optional[str] = ""
    aseguradora: Optional[str] = ""
    num_expediente: Optional[str] = ""
    fecha_siniestro: Optional[str] = None
    descripcion: str = ""
    # Estado
    estado: str = "Abierto"   # Abierto / En gestión / Cerrado
    resolucion: Optional[str] = ""
    notas: Optional[str] = ""

class ClaimUpdate(ClaimCreate):
    pass
