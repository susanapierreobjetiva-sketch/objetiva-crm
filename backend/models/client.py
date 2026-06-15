from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Contact(BaseModel):
    name: str
    role: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""

class Activity(BaseModel):
    date: datetime
    user: str
    note: str

class ClientCreate(BaseModel):
    name: str
    company: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    stage: str = "Nuevo"
    assigned_to: Optional[str] = ""
    assigned_to_id: Optional[str] = ""
    contacts: List[Contact] = []
    notes: Optional[str] = ""
    value: Optional[float] = 0
    alert_date: Optional[str] = None
    tags: List[str] = []

class ClientUpdate(ClientCreate):
    pass
