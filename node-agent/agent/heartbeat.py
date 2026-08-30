import asyncio
import logging
import httpx
from agent.schemas import HeartbeatRequest, HeartbeatResponse, NodeCommand

logger = logging.getLogger(__name__)

class HeartbeatSender:
    def __init__(self, config, metrics_collector, http_client: httpx.AsyncClient, service_registry, command_processor):
        self.config = config
        self.metrics_collector = metrics_collector
        self.http_client = http_client
        self.service_registry = service_registry
        self.command_processor = command_processor
        self.running = False

    async def send_heartbeat(self) -> list[NodeCommand]:
        try:
            metrics = self.metrics_collector.collect()
            metrics.latency_ms = self.metrics_collector.measure_latency(self.config.CONTROL_PLANE_URL)
            service_status = self.service_registry.get_service_status()

            payload = HeartbeatRequest(
                node_id=self.config.NODE_ID,
                metrics=metrics,
                service_status=service_status,
                errors=[]
            )

            url = f"{self.config.CONTROL_PLANE_URL}/api/v1/nodes/{self.config.NODE_ID}/heartbeat"
            headers = {
                "X-API-Key": self.config.API_KEY,
                "X-Node-Id": self.config.NODE_ID
            }

            response = await self.http_client.post(url, headers=headers, json=payload.model_dump(mode="json"), timeout=10.0)
            response.raise_for_status()

            data = HeartbeatResponse.model_validate(response.json())
            return data.pending_commands
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 404):
                logger.warning(f"Node heartbeat returned {e.response.status_code}. Auto-re-registering node...")
                try:
                    from agent.registration import RegistrationManager
                    reg = RegistrationManager()
                    self.config.NODE_ID, self.config.API_KEY = await reg.register(self.config, self.http_client)
                    logger.info(f"Re-registered successfully: {self.config.NODE_ID}")
                except Exception as reg_err:
                    logger.error(f"Auto-registration failed: {reg_err}")
            else:
                logger.error(f"Heartbeat HTTP error: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to send heartbeat: {e}")
            return []

    async def start(self):
        self.running = True
        logger.info("Started heartbeat sender")
        while self.running:
            commands = await self.send_heartbeat()
            if commands:
                await self.command_processor.execute_commands(commands, self.service_registry)
            await asyncio.sleep(self.config.HEARTBEAT_INTERVAL)

    def stop(self):
        self.running = False
