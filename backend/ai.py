import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from groq import Groq
from auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class EmailRequest(BaseModel):
    contexto: str

@router.post("/redactar-correo")
async def redactar_correo(request: EmailRequest, current_user: dict = Depends(get_current_user)):
    if not request.contexto.strip():
        raise HTTPException(status_code=400, detail="El contexto no puede estar vacío")
    
    client = Groq(api_key=GROQ_API_KEY)
    
    prompt = f"""Eres un asistente profesional de una correduría de seguros llamada Objetiva Broker.
Redacta un correo electrónico profesional, cordial y conciso en español.

Contexto proporcionado por el agente:
{request.contexto}

Devuelve únicamente el correo, con Asunto, saludo, cuerpo y despedida. Sin explicaciones adicionales."""

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1024,
    )
    
    correo = completion.choices[0].message.content
    return {"correo": correo}
