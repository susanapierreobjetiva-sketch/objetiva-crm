from pydantic import BaseModel
from typing import Optional

class PolicyCreate(BaseModel):
    client_id: str
    # Datos de la póliza
    ramo: str = "Hogar"
    aseguradora: str = ""
    num_poliza: Optional[str] = ""
    prima_anual: Optional[float] = 0
    fecha_efecto: Optional[str] = None
    fecha_renovacion: Optional[str] = None
    # Estado
    estado_tramite: str = "Nuevo"   # Nuevo / En seguimiento / Negociación / Emitido / Anulado
    estado_poliza: Optional[str] = ""  # Activa / Baja
    notas: Optional[str] = ""

class PolicyUpdate(PolicyCreate):
    pass
