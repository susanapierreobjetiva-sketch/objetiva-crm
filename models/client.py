# models/client.py — con validación de formato
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
import re

DNI_RE  = re.compile(r"^\d{8}[A-HJ-NP-TV-Z]$", re.IGNORECASE)
NIE_RE  = re.compile(r"^[XYZ]\d{7}[A-HJ-NP-TV-Z]$", re.IGNORECASE)
CIF_RE  = re.compile(r"^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$", re.IGNORECASE)


class Contact(BaseModel):
    name:  str
    role:  Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""


class TesisPolicy(BaseModel):
    ramo:              Optional[str]   = ""
    aseguradora:       Optional[str]   = ""
    num_poliza:        Optional[str]   = ""
    prima_anual:       Optional[float] = 0
    fecha_efecto:      Optional[str]   = ""
    fecha_vencimiento: Optional[str]   = ""
    estado:            Optional[str]   = ""
    notas:             Optional[str]   = ""


class TesisClaim(BaseModel):
    ramo:            Optional[str]   = ""
    aseguradora:     Optional[str]   = ""
    num_expediente:  Optional[str]   = ""
    fecha_siniestro: Optional[str]   = ""
    descripcion:     Optional[str]   = ""
    resolucion:      Optional[str]   = ""
    importe:         Optional[float] = 0
    estado:          Optional[str]   = "Cerrado"


class ClientCreate(BaseModel):
    name:           str
    email:          Optional[EmailStr] = None
    phone:          Optional[str]      = ""
    address:        Optional[str]      = ""
    dni:            Optional[str]      = ""
    birth_date:     Optional[str]      = None
    tipo:           Optional[str]      = "Particular"
    empresa:        Optional[str]      = ""
    notas:          Optional[str]      = ""
    assigned_to:    Optional[str]      = ""
    assigned_to_id: Optional[str]      = ""
    tesis_policies: List[TesisPolicy]  = []
    tesis_claims:   List[TesisClaim]   = []

    @field_validator("dni")
    @classmethod
    def validate_dni(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        v = v.strip().upper()
        if DNI_RE.match(v) or NIE_RE.match(v) or CIF_RE.match(v):
            return v
        raise ValueError("DNI/NIE/CIF con formato inválido")

    @field_validator("tipo")
    @classmethod
    def validate_tipo(cls, v: Optional[str]) -> Optional[str]:
        allowed = {"Particular", "Empresa", "Autónomo"}
        if v and v not in allowed:
            raise ValueError(f"tipo debe ser uno de: {', '.join(allowed)}")
        return v


class ClientUpdate(ClientCreate):
    pass
