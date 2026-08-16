from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    if get_settings().app_env in {"development", "test"}:
        Base.metadata.create_all(bind=engine)
    yield


settings = get_settings()
app = FastAPI(
    title="ClarIA — Billing Explanation API",
    version="1.0.0",
    description="Explicaciones financieras basadas únicamente en evidencia estructurada.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)
app.include_router(router)
