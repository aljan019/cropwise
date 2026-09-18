import sys
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Prevent UnicodeEncodeError on Windows (default console encoding may be cp1252)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Configure Paths so sub-modules can be imported
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
sys.path.append(str(BASE_DIR / "ml"))
sys.path.append(str(BASE_DIR / "mandi_intelligence"))
sys.path.append(str(BASE_DIR / "scrapbot" / "src"))

# Import the sub-applications (schemes optional if fpdf etc. missing)
from mandi_intelligence.api.main import app as mandi_app
from mandi_intelligence.api.main import (
    list_mandis as mandi_list_mandis,
    get_response as mandi_get_response,
    submit_response as mandi_submit_response,
    health_check as mandi_health_check,
    RecommendRequest,
    RespondRequest,
)
from fertilizer_router import router as fertilizer_router

try:
    from disease_detection.predict import router as disease_router, warmup_model_in_background
    disease_loaded = True
except Exception as e:
    disease_loaded = False
    disease_router = None
    warmup_model_in_background = None
    print("WARNING: Disease detection not loaded:", e)

try:
    from scrapbot.src.main import app as scrapbot_app
    scrapbot_loaded = True
except Exception as e:
    scrapbot_loaded = False
    scrapbot_app = None
    # Windows terminals may not support emoji in stdout encoding; keep logs ASCII.
    print("WARNING: Scheme assistant not loaded (install fpdf for full support):", e)

try:
    # Override YIELD_ARTIFACT_DIR to point at our local copy of the artifacts
    os.environ.setdefault(
        "YIELD_ARTIFACT_DIR",
        str(BASE_DIR / "yield_service" / "artifacts"),
    )
    from yield_service.app import app as yield_app
    yield_loaded = True
except Exception as _ye:
    yield_loaded = False
    yield_app = None
    print("WARNING: Yield service not loaded:", _ye)

# Create the Master App
app = FastAPI(
    title="BeejRakshak Unified API",
    description="Unified API for Mandi Intelligence and Government Scheme Assistance",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://crop-wise-lime.vercel.app",
        "https://beej-rakshak.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_origin_regex=r"(https://crop-wise.*\.vercel\.app|http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Claim-Risk", "X-Claim-Loss", "Content-Disposition"],
)

# Mount the sub-applications
app.mount("/mandi", mandi_app)
if scrapbot_loaded:
    app.mount("/schemes", scrapbot_app)
if yield_loaded:
    app.mount("/yield", yield_app)
app.include_router(fertilizer_router, prefix="/api")
if disease_loaded:
    app.include_router(disease_router, prefix="/disease")

@app.on_event("startup")
async def startup_event():
    """Trigger startup events for mounted sub-applications"""
    print("Starting BeejRakshak Unified API...")
    
    # Manually trigger mandi_app startup
    # FastAPI mounted apps don't auto-run their startup events
    from mandi_intelligence.api.main import startup_event as mandi_startup
    await mandi_startup()

    if warmup_model_in_background:
        warmup_model_in_background()
    
    print("All services initialized!")

@app.get("/")
def root():
    return {
        "message": "Welcome to BeejRakshak Unified API",
        "modules": {
            "mandi_intelligence": "/mandi/docs",
            "scheme_assistant": "/schemes/docs",
            "disease_detection": "/disease/health" if disease_loaded else "unavailable",
            "yield": "/yield/docs" if yield_loaded else "unavailable",
        },
        "status": "operational"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/mandis")
async def mandis_root_alias():
    return await mandi_list_mandis()


@app.post("/response")
async def response_root_alias(request: dict):
    return await mandi_get_response(RecommendRequest(**request))


@app.post("/respond")
async def respond_root_alias(request: dict):
    return await mandi_submit_response(RespondRequest(**request))


@app.get("/mandi-health")
async def mandi_health_root_alias():
    return await mandi_health_check()


# Schemes recommend fallback when scrapbot app failed to load (e.g. missing fpdf)
class SchemeRequest(BaseModel):
    state: str
    land_size_hectares: float
    category: str





if not scrapbot_loaded:
    from scrapbot.src.scheme_matcher import get_recommended_schemes

    @app.post("/schemes/api/v1/schemes/recommend")
    async def schemes_recommend_fallback(request: SchemeRequest):
        profile = {"state": request.state, "category": request.category}
        matches = get_recommended_schemes(profile)
        return {"status": "success", "farmer_profile": profile, "count": len(matches), "schemes": matches}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
