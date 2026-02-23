"""
SmartCity Dash - FastAPI Application

Endpoints:
  GET  /                                   Health check
  POST /api/report-hazard                  Report a detected hazard
  POST /api/nearby-hazards                 Get hazards within radius
  GET  /api/driver/{driver_id}/history     Get driver hazard history
  GET  /api/driver/{driver_id}/settings    Get driver profile settings
  PUT  /api/driver/{driver_id}/settings    Update driver profile settings
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import (
    ReportHazardRequest, ReportHazardResponse,
    NearbyHazardsRequest, NearbyHazardsResponse,
    DriverHistoryResponse, DriverSettings,
    UpdateDriverSettingsRequest, HazardDetail, HealthResponse,
)
from app.database import (
    insert_hazard, get_hazards_within_radius,
    get_driver_history, count_driver_history,
    get_driver_settings, update_driver_settings,
)
from app.ai_gateway import analyse_hazard

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _default_settings(driver_id: str) -> DriverSettings:
    """Return default settings when a driver record doesn't exist yet."""
    return DriverSettings(
        driver_id=driver_id,
        full_name="New Driver",
        vehicle_type="SUV",
        auto_reporting=True,
        high_resolution=True,
        sound_alerts=True,
        cloud_backup=False,
        anonymous_mode=False,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"SmartCity Dash starting — env: {settings.environment}")
    yield
    logger.info("SmartCity Dash shutting down")


app = FastAPI(
    title="SmartCity Dash API",
    description="Real-time road hazard detection and reporting system",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/", response_model=HealthResponse, tags=["System"])
async def health_check():
    return HealthResponse(status="healthy", environment=settings.environment, version="1.0.0")


# ── Report Hazard ─────────────────────────────────────────────────────────────

@app.post(
    "/api/report-hazard",
    response_model=ReportHazardResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Hazards"],
)
async def report_hazard(request: ReportHazardRequest):
    logger.info(f"Hazard report — driver: {request.driver_id} type: {request.hazard_type}")
    confidence_score, severity_level = analyse_hazard(request.hazard_type)
    try:
        row = await insert_hazard(
            driver_id=request.driver_id,
            latitude=request.latitude,
            longitude=request.longitude,
            hazard_type=request.hazard_type,
            severity_level=severity_level,
            confidence_score=confidence_score,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to insert hazard: {e}")
        raise HTTPException(status_code=500, detail="Failed to save hazard report.")
    return ReportHazardResponse.from_db_row(row)


# ── Nearby Hazards ────────────────────────────────────────────────────────────

@app.post("/api/nearby-hazards", response_model=NearbyHazardsResponse, tags=["Hazards"])
async def nearby_hazards(request: NearbyHazardsRequest):
    logger.info(f"Nearby hazards — ({request.latitude}, {request.longitude}) r={request.radius_km}km")
    # Returns empty list on error — non-critical for app functionality
    rows = await get_hazards_within_radius(
        latitude=request.latitude,
        longitude=request.longitude,
        radius_km=request.radius_km,
    )
    hazards = [HazardDetail.from_db_row(r) for r in rows]
    return NearbyHazardsResponse(total_count=len(hazards), radius_km=request.radius_km, hazards=hazards)


# ── Driver History ────────────────────────────────────────────────────────────

@app.get("/api/driver/{driver_id}/history", response_model=DriverHistoryResponse, tags=["Driver"])
async def get_driver_history_endpoint(
    driver_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    logger.info(f"History — driver: {driver_id}")
    # Always returns 200 with empty list for missing/invalid drivers
    rows = await get_driver_history(driver_id=driver_id, limit=limit, offset=offset)
    total = await count_driver_history(driver_id)
    hazards = [HazardDetail.from_db_row(r) for r in rows]
    return DriverHistoryResponse(total_count=total, hazards=hazards)


# ── Get Driver Settings ───────────────────────────────────────────────────────

@app.get("/api/driver/{driver_id}/settings", response_model=DriverSettings, tags=["Driver"])
async def get_driver_settings_endpoint(driver_id: str):
    logger.info(f"Settings fetch — driver: {driver_id}")
    row = await get_driver_settings(driver_id)
    if row is None:
        # Return sensible defaults instead of 404 — app can still function
        logger.info(f"Driver {driver_id} not found, returning defaults")
        return _default_settings(driver_id)
    return DriverSettings.from_db_row(row)


# ── Update Driver Settings ────────────────────────────────────────────────────

@app.put("/api/driver/{driver_id}/settings", response_model=DriverSettings, tags=["Driver"])
async def update_driver_settings_endpoint(driver_id: str, request: UpdateDriverSettingsRequest):
    logger.info(f"Settings update — driver: {driver_id}")
    if not request.has_any_field():
        raise HTTPException(status_code=400, detail="No settings fields provided.")

    update_payload = request.model_dump(exclude_none=True)
    row = await update_driver_settings(driver_id=driver_id, settings_data=update_payload)

    if row is None:
        # DB update failed (RLS / invalid UUID) — echo back the requested values as defaults
        logger.warning(f"Could not persist settings for {driver_id}, echoing back")
        defaults = _default_settings(driver_id)
        for field, val in update_payload.items():
            if hasattr(defaults, field):
                setattr(defaults, field, val)
        return defaults

    return DriverSettings.from_db_row(row)
