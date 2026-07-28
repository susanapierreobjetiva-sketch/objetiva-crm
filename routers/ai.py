from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from groq import Groq
from routers.auth import get_current_user
import os

router = APIRouter()

class EmailRequest(BaseModel):
    contexto: str

@router.post("/redactar-correo")
async def redactar_correo(request: EmailRequest, current_user: dict = Depends(get_current_user)):
    if not request.contexto.strip():
        raise HTTPException(status_code=400, detail="El contexto no puede estar vacío")
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY no configurada")

    client = Groq(api_key=api_key)
    
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

class ResumenRequest(BaseModel):
    texto: str

@router.post("/resumir")
async def resumir_correo(request: ResumenRequest, current_user: dict = Depends(get_current_user)):
    api_key = os.getenv("GROQ_API_KEY")
    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{
            "role": "user",
            "content": f"Resume en una sola frase de máximo 15 palabras qué comunica este correo. Solo la frase, sin puntos ni explicaciones:\n\n{request.texto}"
        }],
        temperature=0.3,
        max_tokens=60,
    )
    return {"resumen": completion.choices[0].message.content.strip()}
