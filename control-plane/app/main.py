from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import logging
from app.db import init_db, AsyncSessionLocal
from app.config import settings
from app.routers import auth, nodes, cluster, ws, tenants
from app.services.heartbeat_monitor import heartbeat_monitor
from app.services.node_manager import NodeManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ClusterControl API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(nodes.router)
app.include_router(cluster.router)
app.include_router(ws.router)
app.include_router(tenants.router)

async def purge_metrics_task():
    while True:
        try:
            async with AsyncSessionLocal() as session:
                await NodeManager.purge_old_metrics(session)
        except Exception as e:
            logger.error(f"Error purging metrics: {e}")
        await asyncio.sleep(3600) # every hour

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    await init_db()
    logger.info("Starting heartbeat monitor...")
    heartbeat_monitor.start()
    asyncio.create_task(purge_metrics_task())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Stopping heartbeat monitor...")
    heartbeat_monitor.stop()

@app.get("/")
async def root():
    return {
        "name": "ClusterControl API",
        "version": "1.0.0",
        "docs": "/docs"
    }
