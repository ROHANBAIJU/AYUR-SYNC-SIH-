# File: app/main.py
# This file is updated to include a more robust and explicit CORS configuration.

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
import time, json, os
from app.db.session import engine
from app.db.models import Base

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# --- ROBUST CORS MIDDLEWARE CONFIGURATION ---
# This explicitly allows requests from typical development origins.
# --- 2. ADD THIS MIDDLEWARE BLOCK ---
# This allows your frontend (running in the browser) to communicate with your backend

""""
origins = [
    'http://127.0.0.1:5500',  # VS Code Live Server
    'http://localhost:5500',   # Also for Live Server
]
"""

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)


@app.on_event("startup")
def ensure_tables_exist_on_startup():
    """Ensure all ORM-defined tables exist at process start (idempotent)."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        # Non-fatal: app can still run; log to stderr
        try:
            print(f"[STARTUP] Failed to ensure tables: {e}", flush=True)
        except Exception:
            pass


@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        try:
            duration_ms = int((time.perf_counter() - start) * 1000)
            entry = {
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "method": request.method,
                "path": request.url.path,
                "status": getattr(response, 'status_code', 0),
                "duration_ms": duration_ms,
                "client": request.client.host if request.client else None,
                "has_auth": bool(request.headers.get('authorization')),
            }
            log_dir = "/app/logs"
            try:
                os.makedirs(log_dir, exist_ok=True)
            except Exception:
                pass
            with open(os.path.join(log_dir, "access.log"), "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception:
            # best effort only
            pass


@app.get("/")
def read_root():
    return {"message": "Welcome to the NAMASTE-ICD API"}

app.include_router(api_router, prefix=settings.API_V1_STR)

