"""
SmartCity Dash - Pydantic Models
Request and response schemas for all API endpoints.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import uuid


# ── Hazard Types & Severity ───────────────────────────────────────────────────

VALID_HAZARD_TYPES = {
    "pothole",
    "broken_streetlight",
    "waterlogging",
    "traffic_congestion",
    "accident",
    "road_debris",
}

VALID_SEVERITY_LEVELS = {"low", "medium", "high", "critical"}


# ── Request Models ─────────────────────────────────────────────────────────────

class ReportHazardRequest(BaseModel):
    """Request body for POST /api/report-hazard"""
    driver_id: str = Field(..., description="UUID of the driver reporting the hazard")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    hazard_type: str = Field(..., description="Type of hazard detected")

    @field_validator("hazard_type")
    @classmethod
    def validate_hazard_type(cls, v: str) -> str:
        if v not in VALID_HAZARD_TYPES:
            raise ValueError(
                f"Invalid hazard_type '{v}'. Must be one of: {', '.join(sorted(VALID_HAZARD_TYPES))}"
            )
        return v

    @field_validator("driver_id")
    @classmethod
    def validate_driver_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("driver_id cannot be empty")
        return v


class NearbyHazardsRequest(BaseModel):
    """Request body for POST /api/nearby-hazards"""
    driver_id: str = Field(..., description="UUID of the requesting driver")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=2.0, ge=0.1, le=50.0, description="Search radius in kilometres")


class UpdateDriverSettingsRequest(BaseModel):
    """Request body for PUT /api/driver/{driver_id}/settings — all fields optional"""
    full_name: Optional[str] = Field(default=None, max_length=200)
    vehicle_type: Optional[str] = Field(default=None, max_length=100)
    auto_reporting: Optional[bool] = None
    high_resolution: Optional[bool] = None
    sound_alerts: Optional[bool] = None
    cloud_backup: Optional[bool] = None
    anonymous_mode: Optional[bool] = None

    def has_any_field(self) -> bool:
        """Return True if at least one field was provided."""
        return any(v is not None for v in self.model_dump().values())


# ── Response Models ────────────────────────────────────────────────────────────

class HazardDetail(BaseModel):
    """A single hazard record returned in API responses."""
    id: str
    driver_id: str
    hazard_type: str
    severity_level: str
    confidence_score: float
    latitude: float
    longitude: float
    created_at: str

    @classmethod
    def from_db_row(cls, row: dict) -> "HazardDetail":
        """Build a HazardDetail from a Supabase row dict."""
        # Normalise created_at to ISO string
        created = row.get("created_at", "")
        if isinstance(created, datetime):
            created = created.isoformat()

        return cls(
            id=str(row.get("id", "")),
            driver_id=str(row.get("driver_id", "")),
            hazard_type=str(row.get("hazard_type", "")),
            severity_level=str(row.get("severity_level", "medium")),
            confidence_score=float(row.get("confidence_score", 0.0)),
            latitude=float(row.get("latitude", 0.0)),
            longitude=float(row.get("longitude", 0.0)),
            created_at=str(created),
        )


class ReportHazardResponse(HazardDetail):
    """Response for POST /api/report-hazard (201 Created)."""
    pass


class NearbyHazardsResponse(BaseModel):
    """Response for POST /api/nearby-hazards."""
    total_count: int
    radius_km: float
    hazards: List[HazardDetail]


class DriverHistoryResponse(BaseModel):
    """Response for GET /api/driver/{driver_id}/history."""
    total_count: int
    hazards: List[HazardDetail]


class DriverSettings(BaseModel):
    """Driver profile settings — GET and PUT response."""
    driver_id: str
    full_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    auto_reporting: bool = True
    high_resolution: bool = True
    sound_alerts: bool = True
    cloud_backup: bool = False
    anonymous_mode: bool = False
    updated_at: str

    @classmethod
    def from_db_row(cls, row: dict) -> "DriverSettings":
        updated = row.get("updated_at", "")
        if isinstance(updated, datetime):
            updated = updated.isoformat()
        return cls(
            driver_id=str(row.get("id", row.get("driver_id", ""))),
            full_name=row.get("full_name"),
            vehicle_type=row.get("vehicle_type"),
            auto_reporting=bool(row.get("auto_reporting", True)),
            high_resolution=bool(row.get("high_resolution", True)),
            sound_alerts=bool(row.get("sound_alerts", True)),
            cloud_backup=bool(row.get("cloud_backup", False)),
            anonymous_mode=bool(row.get("anonymous_mode", False)),
            updated_at=str(updated),
        )


class HealthResponse(BaseModel):
    """Response for GET /"""
    status: str
    environment: str
    version: str = "1.0.0"
