from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import jobs
from .deps.db import create_db_and_tables, engine
from fastapi.responses import JSONResponse
from sqlmodel import Session
from sqlalchemy import text
import time

app = FastAPI()
origins = [
    "http://localhost:3010",
    "http://localhost:3011",
]
app.include_router(jobs.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/health", tags=["system"])
async def health():
    """Unified liveness + readiness.

    - Pings the DB synchronously.
    - Returns 200 with {status: "ok"} when DB reachable, 503 otherwise.
    """
    db_ok = False
    started = time.perf_counter()
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    latency_ms = int((time.perf_counter() - started) * 1000)

    payload = {
        "status": "ok" if db_ok else "unhealthy",
        "database": "connected" if db_ok else "disconnected",
        "db_latency_ms": latency_ms,
    }
    return JSONResponse(status_code=200 if db_ok else 503, content=payload)
