from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database.session import engine, Base
from app.routers import auth, questions, execution, dashboard, leaderboard, bookmarks, categories, companies, reports

settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="SQL Practice Platform API",
    description="Production-ready SQL practice platform with real query execution",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth.router)
app.include_router(questions.router)
app.include_router(execution.router)
app.include_router(dashboard.router)
app.include_router(leaderboard.router)
app.include_router(bookmarks.router)
app.include_router(categories.router)
app.include_router(companies.router)
app.include_router(reports.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}
