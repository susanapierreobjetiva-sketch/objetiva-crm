#!/usr/bin/env python3
"""
Amplia los dos endpoints PATCH de gestiones en clients.py para permitir
editar mas campos ademas de 'estado'. Retrocompatible: el select de estado
(que solo manda {estado}) sigue funcionando igual.

- gestiones-libres PATCH: acepta cliente, note, tipo, estado
- activity PATCH: acepta note, estado (el modelo activity no tiene tipo ni cliente)

Idempotente + backup con fecha. Ejecutar EN EL VPS:
    python3 patch_backend_gestiones.py
"""
import re, shutil, datetime, sys, os

RUTA = "/root/crm-backend/routers/clients.py"

# --- anclas EXACTAS (tal como se vieron con sed) ---
OLD_GESTION = '''@router.patch("/gestiones-libres/{gestion_id}")
async def update_gestion_libre(gestion_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    data = await request.json()
    await db["gestiones_libres"].update_one({"id": gestion_id}, {"$set": {"estado": data.get("estado", "Pendiente")}})
    return {"message": "Actualizada"}'''

NEW_GESTION = '''@router.patch("/gestiones-libres/{gestion_id}")
async def update_gestion_libre(gestion_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    data = await request.json()
    campos = {}
    if "cliente" in data: campos["cliente"] = str(data["cliente"])[:200]
    if "note"    in data: campos["note"]    = str(data["note"])[:2000]
    if "tipo"    in data: campos["tipo"]    = str(data["tipo"])[:50]
    if "estado"  in data: campos["estado"]  = data["estado"]
    if campos:
        await db["gestiones_libres"].update_one({"id": gestion_id}, {"$set": campos})
    return {"message": "Actualizada"}'''

OLD_ACTIVITY = '''@router.patch("/{client_id}/activity/{activity_id}")
async def update_activity(client_id: str, activity_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    data = await request.json()
    await db["clients"].update_one(
        {"_id": ObjectId(client_id), "activities.id": activity_id},
        {"$set": {"activities.$.estado": data.get("estado", "Pendiente")}}
    )
    return {"message": "Actualizada"}'''

NEW_ACTIVITY = '''@router.patch("/{client_id}/activity/{activity_id}")
async def update_activity(client_id: str, activity_id: str, request: Request, current_user=Depends(get_current_user)):
    db = request.app.db
    data = await request.json()
    campos = {}
    if "note"   in data: campos["activities.$.note"]   = str(data["note"])[:2000]
    if "estado" in data: campos["activities.$.estado"] = data["estado"]
    if campos:
        await db["clients"].update_one(
            {"_id": ObjectId(client_id), "activities.id": activity_id},
            {"$set": campos}
        )
    return {"message": "Actualizada"}'''

def main():
    if not os.path.exists(RUTA):
        sys.exit(f"ERROR: no existe {RUTA}")
    with open(RUTA, encoding="utf-8") as f:
        content = f.read()

    # deteccion de idempotencia
    already = ('if "cliente" in data' in content and "activities.$.note" in content)
    if already:
        print("YA APLICADO: el parche ya esta en el archivo. No se hace nada.")
        return

    errors = []
    if content.count(OLD_GESTION) != 1:
        errors.append(f"ancla GESTION encontrada {content.count(OLD_GESTION)} veces (esperado 1)")
    if content.count(OLD_ACTIVITY) != 1:
        errors.append(f"ancla ACTIVITY encontrada {content.count(OLD_ACTIVITY)} veces (esperado 1)")
    if errors:
        print("ABORTADO. Anclas no coinciden exactamente:")
        for e in errors: print("  -", e)
        print("\nEl archivo del VPS difiere de lo esperado. Revisar antes de parchear.")
        sys.exit(1)

    # backup
    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    bak = f"{RUTA}.bak-{ts}"
    shutil.copy2(RUTA, bak)
    print(f"Backup creado: {bak}")

    new = content.replace(OLD_GESTION, NEW_GESTION).replace(OLD_ACTIVITY, NEW_ACTIVITY)
    assert new != content, "no hubo cambios (inesperado)"

    with open(RUTA, "w", encoding="utf-8") as f:
        f.write(new)
    print("OK: los dos endpoints PATCH ampliados correctamente.")
    print("Ahora reinicia el backend:  systemctl restart crm.service")

if __name__ == "__main__":
    main()
