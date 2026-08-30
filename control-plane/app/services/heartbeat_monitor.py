import asyncio
import datetime
from app.db import AsyncSessionLocal, Node
from sqlalchemy.future import select
from app.config import settings
from app.schemas import NodeStatus
from .ws_manager import ws_manager

class HeartbeatMonitor:
    def __init__(self):
        self.running = False
        self.task = None

    async def _monitor_loop(self):
        while self.running:
            try:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(Node))
                    nodes = result.scalars().all()
                    
                    now = datetime.datetime.utcnow()
                    for node in nodes:
                        if not node.is_enabled:
                            continue
                        
                        is_offline = False
                        if node.last_heartbeat is None:
                            is_offline = True
                        else:
                            delta = (now - node.last_heartbeat).total_seconds()
                            if delta > settings.HEARTBEAT_TIMEOUT_SECONDS:
                                is_offline = True
                        
                        if is_offline and node.status != NodeStatus.OFFLINE.value:
                            node.status = NodeStatus.OFFLINE.value
                            await session.commit()
                            await ws_manager.broadcast_node_status(node.id, NodeStatus.OFFLINE.value)
            except Exception as e:
                print(f"Error in heartbeat monitor: {e}")
            
            await asyncio.sleep(5)

    def start(self):
        self.running = True
        self.task = asyncio.create_task(self._monitor_loop())

    def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()

heartbeat_monitor = HeartbeatMonitor()
