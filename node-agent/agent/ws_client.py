import asyncio
import json
import logging
import websockets
from agent.schemas import NodeCommand
from agent.config import config

logger = logging.getLogger(__name__)

class WSClient:
    def __init__(self, command_processor, service_registry):
        self.command_processor = command_processor
        self.service_registry = service_registry
        self.running = False
        self.ws = None

    async def start(self):
        self.running = True
        ws_url = config.CONTROL_PLANE_URL.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_url}/ws/nodes/{config.NODE_ID}?api_key={config.API_KEY}"
        
        retry_delay = 1
        
        while self.running:
            try:
                async with websockets.connect(ws_url) as ws:
                    self.ws = ws
                    logger.info("Connected to control plane WebSocket")
                    retry_delay = 1
                    
                    # Send initial status
                    await ws.send(json.dumps({"type": "status", "status": "online"}))
                    
                    async for message in ws:
                        if not self.running:
                            break
                        try:
                            data = json.loads(message)
                            cmd = NodeCommand.model_validate(data)
                            await self.command_processor.execute_commands([cmd], self.service_registry)
                        except Exception as e:
                            logger.error(f"Failed to process WS message: {e}")
                            
            except Exception as e:
                logger.error(f"WebSocket disconnected: {e}. Reconnecting in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)

    async def stop(self):
        self.running = False
        if self.ws:
            await self.ws.close()
