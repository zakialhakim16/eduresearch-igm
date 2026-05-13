from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.routers import analytics, classify, health, jobs, recommend, scoring, search


settings = get_settings()
configure_logging()

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(recommend.router, prefix="/recommend", tags=["recommend"])
app.include_router(scoring.router, prefix="/score", tags=["scoring"])
app.include_router(classify.router, prefix="/classify", tags=["classify"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
