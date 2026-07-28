from fastapi import APIRouter, Request, Depends
from routers.auth import get_current_user
from datetime import datetime, timezone

router = APIRouter()


@router.get("")
async def get_dashboard(request: Request, current_user=Depends(get_current_user)):
    db       = request.app.db
    is_admin = current_user["role"] == "admin"
    user_id  = str(current_user["_id"])

    # ── Filtros base ──────────────────────────────────────────
    client_filter  = {} if is_admin else {"assigned_to_id": user_id}

    # IDs de clientes del agente (solo necesario para no-admin)
    if not is_admin:
        client_ids = await db["clients"].distinct("_id", client_filter)
        client_ids_str = [str(c) for c in client_ids]
        policy_filter = {"client_id": {"$in": client_ids_str}}
        claim_filter  = {"client_id": {"$in": client_ids_str}}
    else:
        policy_filter = {}
        claim_filter  = {}

    # ── Clientes: count + desglose tipo ──────────────────────
    client_pipeline = [
        {"$match": client_filter},
        {"$group": {
            "_id":          "$tipo",
            "count":        {"$sum": 1},
        }},
    ]
    client_agg   = await db["clients"].aggregate(client_pipeline).to_list(20)
    total_clientes  = sum(r["count"] for r in client_agg)
    particulares    = next((r["count"] for r in client_agg if r["_id"] == "Particular"), 0)
    empresas        = next((r["count"] for r in client_agg if r["_id"] == "Empresa"), 0)

    # ── Pólizas: KPIs + agrupaciones ─────────────────────────
    policy_pipeline = [
        {"$match": policy_filter},
        {"$group": {
            "_id":           None,
            "total":         {"$sum": 1},
            "prima_total":   {"$sum": {"$toDouble": {"$ifNull": ["$prima_anual", 0]}}},
        }},
    ]
    policy_kpi   = await db["policies"].aggregate(policy_pipeline).to_list(1)
    total_polizas = policy_kpi[0]["total"]       if policy_kpi else 0
    prima_total   = policy_kpi[0]["prima_total"] if policy_kpi else 0.0

    # Renovaciones: solo traemos los campos necesarios
    hoy = datetime.now(timezone.utc).date()
    renovaciones_30 = renovaciones_60 = renovaciones_90 = 0
    cursor = db["policies"].find(policy_filter, {"fecha_renovacion": 1, "_id": 0})
    async for p in cursor:
        fecha_str = p.get("fecha_renovacion", "")
        if not fecha_str:
            continue
        try:
            fecha = datetime.strptime(fecha_str[:10], "%Y-%m-%d").date()
            dias  = (fecha - hoy).days
            if 0 <= dias <= 30:  renovaciones_30 += 1
            if 0 <= dias <= 60:  renovaciones_60 += 1
            if 0 <= dias <= 90:  renovaciones_90 += 1
        except ValueError:
            pass

    # Por ramo
    ramo_pipeline = [
        {"$match": policy_filter},
        {"$group": {"_id": {"$ifNull": ["$ramo", "Sin ramo"]}, "count": {"$sum": 1}}},
    ]
    ramos = {r["_id"]: r["count"] for r in await db["policies"].aggregate(ramo_pipeline).to_list(50)}

    # Por aseguradora
    aseg_pipeline = [
        {"$match": policy_filter},
        {"$group": {"_id": {"$ifNull": ["$aseguradora", "Sin aseguradora"]}, "count": {"$sum": 1}}},
    ]
    aseguradoras = {r["_id"]: r["count"] for r in await db["policies"].aggregate(aseg_pipeline).to_list(50)}

    # Por estado póliza
    estado_pipeline = [
        {"$match": policy_filter},
        {"$group": {"_id": {"$ifNull": ["$estado_poliza", "Sin estado"]}, "count": {"$sum": 1}}},
    ]
    estados_poliza = {r["_id"]: r["count"] for r in await db["policies"].aggregate(estado_pipeline).to_list(20)}

    # ── Siniestros ────────────────────────────────────────────
    claim_pipeline = [
        {"$match": claim_filter},
        {"$group": {
            "_id":    "$estado",
            "count":  {"$sum": 1},
        }},
    ]
    claim_agg        = await db["claims"].aggregate(claim_pipeline).to_list(20)
    total_siniestros  = sum(r["count"] for r in claim_agg)
    siniestros_abiertos = next((r["count"] for r in claim_agg if r["_id"] == "Abierto"), 0)
    siniestros_cerrados = next((r["count"] for r in claim_agg if r["_id"] == "Cerrado"), 0)

    sramo_pipeline = [
        {"$match": claim_filter},
        {"$group": {"_id": {"$ifNull": ["$ramo", "Sin ramo"]}, "count": {"$sum": 1}}},
    ]
    siniestros_ramo = {r["_id"]: r["count"] for r in await db["claims"].aggregate(sramo_pipeline).to_list(50)}

    return {
        "clientes": {
            "total":        total_clientes,
            "particulares": particulares,
            "empresas":     empresas,
        },
        "polizas": {
            "total":           total_polizas,
            "prima_total":     round(prima_total, 2),
            "renovaciones_30": renovaciones_30,
            "renovaciones_60": renovaciones_60,
            "renovaciones_90": renovaciones_90,
            "por_ramo":        ramos,
            "por_aseguradora": aseguradoras,
            "por_estado":      estados_poliza,
        },
        "siniestros": {
            "total":    total_siniestros,
            "abiertos": siniestros_abiertos,
            "cerrados": siniestros_cerrados,
            "por_ramo": siniestros_ramo,
        },
    }
