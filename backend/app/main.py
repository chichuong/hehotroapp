from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import auth, properties, health, favorites, dss, ahp, ai, compare, dashboard, insights, admin

app = FastAPI(
    title="Real Estate DSS API",
    description="Phase 7 - Decision-friendly real estate DSS with explainability, comparison, dashboard, insights, and admin visibility",
    version="7.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(properties.router, prefix="/api/properties", tags=["Properties"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(compare.router, prefix="/api/compare", tags=["Comparison"])
app.include_router(dss.router, prefix="/api/dss", tags=["DSS"])
app.include_router(ahp.router, prefix="/api/dss", tags=["AHP"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Valuation"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/", include_in_schema=False)
def read_root():
    return {
        "status": "online",
        "message": "Real Estate DSS API is running. Xin hãy truy cập vào đường dẫn Frontend (trên Vercel) để sử dụng ứng dụng.",
        "docs": "/docs"
    }
