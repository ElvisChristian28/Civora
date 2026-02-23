"""
SmartCity Dash Backend Entry Point

Run with:
    python main.py

Or with uvicorn directly:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=(settings.environment == "development"),
        log_level="info"
    )
