from fastapi import WebSocket
from typing import Dict, List
import json
from app.schemas import NodeCommand

class WSManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.dashboard_connections: List[WebSocket] = []

    async def connect_node(self, node_id: str, ws: WebSocket):
        await ws.accept()
        self.connections[node_id] = ws

    def disconnect_node(self, node_id: str):
        if node_id in self.connections:
            del self.connections[node_id]

    async def connect_dashboard(self, ws: WebSocket):
        await ws.accept()
        self.dashboard_connections.append(ws)

    def disconnect_dashboard(self, ws: WebSocket):
        if ws in self.dashboard_connections:
            self.dashboard_connections.remove(ws)

    async def send_command_to_node(self, node_id: str, command: NodeCommand) -> bool:
        if node_id in self.connections:
            try:
                await self.connections[node_id].send_text(command.model_dump_json())
                return True
            except:
                pass
        return False

    async def broadcast_to_dashboards(self, event: dict):
        dead_connections = []
        for ws in self.dashboard_connections:
            try:
                await ws.send_text(json.dumps(event))
            except:
                dead_connections.append(ws)
        for ws in dead_connections:
            self.dashboard_connections.remove(ws)

    async def broadcast_node_status(self, node_id: str, status: str):
        await self.broadcast_to_dashboards({"type": "node_status", "node_id": node_id, "status": status})

ws_manager = WSManager()
