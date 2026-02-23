"""
SmartCity Dash - Database Layer
All Supabase interactions are centralised here.
"""

import logging
import re
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger(__name__)

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

def is_valid_uuid(value: str) -> bool:
    return bool(_UUID_RE.match(value.strip()))


# ── Supabase Client Singleton ─────────────────────────────────────────────────

class SupabaseClient:
    _client: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._client is None:
            cls._client = create_client(settings.supabase_url, settings.supabase_key)
            logger.info("Supabase client initialised")
        return cls._client


def get_db() -> Client:
    return SupabaseClient.get_client()


# ── Hazard Functions ──────────────────────────────────────────────────────────

async def insert_hazard(
    driver_id: str, latitude: float, longitude: float,
    hazard_type: str, severity_level: str, confidence_score: float,
) -> Dict[str, Any]:
    if not is_valid_uuid(driver_id):
        raise ValueError(f"driver_id '{driver_id}' is not a valid UUID")
    db = get_db()
    try:
        result = db.rpc("insert_hazard", {
            "p_driver_id": driver_id,
            "p_latitude": latitude,
            "p_longitude": longitude,
            "p_hazard_type": hazard_type,
            "p_severity_level": severity_level,
            "p_confidence_score": confidence_score,
        }).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise ValueError("No data returned from insert_hazard RPC")
    except Exception as e:
        logger.error(f"insert_hazard failed: {e}")
        raise


async def get_hazards_within_radius(
    latitude: float, longitude: float, radius_km: float,
) -> List[Dict[str, Any]]:
    db = get_db()
    try:
        result = db.rpc("get_hazards_within_radius", {
            "p_latitude": latitude,
            "p_longitude": longitude,
            "p_radius_km": radius_km,
        }).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"get_hazards_within_radius failed: {e}")
        return []


async def get_driver_history(
    driver_id: str, limit: int = 100, offset: int = 0,
) -> List[Dict[str, Any]]:
    if not is_valid_uuid(driver_id):
        logger.warning(f"get_driver_history: invalid UUID '{driver_id}', returning empty")
        return []
    db = get_db()
    try:
        result = (
            db.table("hazards")
            .select("*")
            .eq("driver_id", driver_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"get_driver_history failed for {driver_id}: {e}")
        return []


async def count_driver_history(driver_id: str) -> int:
    if not is_valid_uuid(driver_id):
        return 0
    db = get_db()
    try:
        result = (
            db.table("hazards")
            .select("id", count="exact")
            .eq("driver_id", driver_id)
            .execute()
        )
        return result.count or 0
    except Exception as e:
        logger.error(f"count_driver_history failed: {e}")
        return 0


# ── Driver Settings Functions ─────────────────────────────────────────────────

async def get_driver_settings(driver_id: str) -> Optional[Dict[str, Any]]:
    if not is_valid_uuid(driver_id):
        logger.warning(f"get_driver_settings: invalid UUID '{driver_id}'")
        return None
    db = get_db()
    try:
        result = (
            db.table("drivers")
            .select("*")
            .eq("id", driver_id)
            .maybe_single()
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error(f"get_driver_settings failed for {driver_id}: {e}")
        return None


async def upsert_driver_settings(
    driver_id: str, settings_data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if not is_valid_uuid(driver_id):
        return None
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    payload = {"id": driver_id, **settings_data, "updated_at": now}
    try:
        result = db.table("drivers").upsert(payload, on_conflict="id").execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"upsert_driver_settings failed: {e}")
        return None


async def update_driver_settings(
    driver_id: str, settings_data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if not is_valid_uuid(driver_id):
        return None
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    payload = {**settings_data, "updated_at": now}
    try:
        result = (
            db.table("drivers")
            .update(payload)
            .eq("id", driver_id)
            .execute()
        )
        if result.data and len(result.data) > 0:
            return result.data[0]
        logger.info(f"Driver {driver_id} not found, attempting upsert")
        return await upsert_driver_settings(driver_id, settings_data)
    except Exception as e:
        logger.error(f"update_driver_settings failed for {driver_id}: {e}")
        return None
