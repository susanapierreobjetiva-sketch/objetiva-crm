from pydantic import BaseModel
from typing import Optional

class EmailCreate(BaseModel):
    entity_type: str  # "client" o "claim"
    entity_id: str
    asunto: str
    resumen: str
    cuerpo: Optional[str] = ""
    agente: Optional[str] = ""

class EmailUpdate(BaseModel):
    asunto: Optional[str] = None
    resumen: Optional[str] = None
