import asyncio
import logging
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agent.config import config
from agent.metrics import MetricsCollector
from agent.registration import RegistrationManager
from agent.service_registry import ServiceRegistry
from agent.heartbeat import HeartbeatSender
from agent.commands import CommandProcessor
from agent.ws_client import WSClient
from agent.commands import is_node_disabled

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=f"ClusterNode Agent - {config.NODE_NAME}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
http_client = httpx.AsyncClient()
metrics_collector = MetricsCollector()
registration_manager = RegistrationManager()
service_registry = ServiceRegistry()
command_processor = CommandProcessor()
ws_client = WSClient(command_processor, service_registry)

heartbeat_sender = None

@app.middleware("http")
async def check_disabled(request: Request, call_next):
    from agent.commands import is_node_disabled
    if is_node_disabled and request.url.path not in ["/health", "/metrics"]:
        return JSONResponse(status_code=503, content={"detail": "Node is disabled"})
    return await call_next(request)

@app.on_event("startup")
async def startup_event():
    global heartbeat_sender
    
    # 1. Load or register
    state = await registration_manager.load_saved_state(config)
    if state:
        config.NODE_ID, config.API_KEY = state
        logger.info(f"Loaded node_id {config.NODE_ID} from state file for {config.NODE_NAME}")
    else:
        config.NODE_ID, config.API_KEY = await registration_manager.register(config, http_client)
        
    # 2. Start service
    service = service_registry.create_service(config.NODE_TYPE, config)
    await service.start()
    router = service_registry.get_service_router()
    if router:
        app.include_router(router)
        
    # 3. Background tasks
    heartbeat_sender = HeartbeatSender(config, metrics_collector, http_client, service_registry, command_processor)
    asyncio.create_task(heartbeat_sender.start())
    asyncio.create_task(ws_client.start())

@app.on_event("shutdown")
async def shutdown_event():
    if heartbeat_sender:
        heartbeat_sender.stop()
    await ws_client.stop()
    if service_registry.active_service:
        await service_registry.active_service.stop()
    await http_client.aclose()

@app.get("/health")
def health_check():
    from agent.commands import is_node_disabled
    return {
        "status": "disabled" if is_node_disabled else "ok",
        "node_id": config.NODE_ID,
        "node_type": config.NODE_TYPE,
        "uptime_seconds": 0,  # Could be tracked
        "is_enabled": not is_node_disabled
    }

@app.get("/metrics")
def get_metrics():
    return metrics_collector.collect().model_dump()
