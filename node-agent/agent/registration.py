import os
import json
import asyncio
import httpx
import logging
from agent.schemas import NodeRegisterRequest, NodeType

logger = logging.getLogger(__name__)

class RegistrationManager:
    def __init__(self):
        # Use NODE_NAME in the state file so multiple nodes in the same dir don't collide
        self.state_file = "./agent_state.json"  # will be overridden in register()

    async def register(self, config, http_client: httpx.AsyncClient) -> tuple[str, str]:
        # Per-node state file keyed by NODE_NAME
        self.state_file = f"./agent_state_{config.NODE_NAME}.json"
        url = f"{config.CONTROL_PLANE_URL}/api/v1/nodes/register"
        payload = NodeRegisterRequest(
            name=config.NODE_NAME,
            node_type=NodeType(config.NODE_TYPE),
            host=config.NODE_HOST,
            port=config.NODE_PORT,
            region=config.NODE_REGION,
            version=config.AGENT_VERSION
        )

        for attempt in range(5):
            try:
                response = await http_client.post(url, json=payload.model_dump(mode="json"))
                response.raise_for_status()
                data = response.json()
                node_id = data["node_id"]
                api_key = data["api_key"]
                
                with open(self.state_file, "w") as f:
                    json.dump({"node_id": node_id, "api_key": api_key}, f)
                
                logger.info(f"Successfully registered node {node_id}")
                return node_id, api_key
            except Exception as e:
                logger.error(f"Failed to register (attempt {attempt+1}/5): {e}")
                await asyncio.sleep(2 ** attempt)
        
        raise RuntimeError("Failed to register node after 5 attempts")

    async def load_saved_state(self, config=None) -> tuple[str, str] | None:
        # Use per-node state file if config provided
        if config:
            self.state_file = f"./agent_state_{config.NODE_NAME}.json"
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r") as f:
                    data = json.load(f)
                    return data.get("node_id"), data.get("api_key")
            except Exception as e:
                logger.error(f"Failed to load saved state: {e}")
        return None
