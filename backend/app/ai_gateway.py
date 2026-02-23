"""
SmartCity Dash - AI Gateway
Currently uses a mock confidence scorer.
Replace generate_mock_confidence_score() with your real YOLO model inference.

Integration guide:
  1. Place your YOLOv8/TFLite model file in assets/models/
  2. Replace the function body below with actual inference code
  3. Optionally accept image_bytes as a parameter for real detection
"""

import random
from typing import Tuple
from app.config import settings


# ── Severity thresholds ───────────────────────────────────────────────────────

# Maps hazard_type → base severity (can be overridden by confidence)
HAZARD_BASE_SEVERITY = {
    "accident":            "critical",
    "pothole":             "high",
    "waterlogging":        "high",
    "traffic_congestion":  "medium",
    "broken_streetlight":  "medium",
    "road_debris":         "medium",
}


def generate_mock_confidence_score() -> float:
    """
    Returns a random confidence score between configured min/max.

    TODO: Replace this entire function with real YOLOv8 model inference:

        from ultralytics import YOLO
        model = YOLO("assets/models/yolo_hazard.pt")

        def generate_confidence_score(image_bytes: bytes) -> float:
            results = model.predict(source=image_bytes, verbose=False)
            if results and results[0].boxes:
                return float(results[0].boxes.conf.max())
            return 0.0
    """
    return round(
        random.uniform(
            settings.mock_ai_confidence_min,
            settings.mock_ai_confidence_max,
        ),
        4,
    )


def determine_severity(hazard_type: str, confidence_score: float) -> str:
    """
    Determines severity level from hazard type and confidence score.

    High confidence → bumps severity up.
    Low confidence  → bumps severity down.
    """
    base = HAZARD_BASE_SEVERITY.get(hazard_type, "medium")

    severity_order = ["low", "medium", "high", "critical"]
    base_idx = severity_order.index(base)

    if confidence_score >= 0.92:
        # High confidence: upgrade severity by 1 step (capped at critical)
        adjusted_idx = min(base_idx + 1, len(severity_order) - 1)
    elif confidence_score < 0.80:
        # Low confidence: downgrade severity by 1 step (floored at low)
        adjusted_idx = max(base_idx - 1, 0)
    else:
        adjusted_idx = base_idx

    return severity_order[adjusted_idx]


def analyse_hazard(hazard_type: str) -> Tuple[float, str]:
    """
    Main entry point: returns (confidence_score, severity_level).
    Called by the report-hazard endpoint.
    """
    confidence = generate_mock_confidence_score()
    severity = determine_severity(hazard_type, confidence)
    return confidence, severity
