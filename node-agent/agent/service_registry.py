import logging
from agent.services.db_service import DBService
from agent.services.auth_service import AuthService
from agent.services.file_service import FileService
from agent.services.cache_service import CacheService
from fastapi import APIRouter

logger = logging.getLogger(__name__)

class ServiceRegistry:
    def __init__(self):
        self.active_service = None

    def create_service(self, node_type: str, config):
        if node_type in ["primary_db", "replica_db"]:
            self.active_service = DBService(config, is_primary=(node_type=="primary_db"))
        elif node_type == "auth":
            self.active_service = AuthService(config)
        elif node_type == "file_storage":
            self.active_service = FileService(config)
        elif node_type == "cache_search":
            self.active_service = CacheService(config)
        else:
            raise ValueError(f"Unknown node type: {node_type}")
        return self.active_service

    def get_service_status(self) -> dict[str, bool]:
        if self.active_service:
            return self.active_service.get_status()
        return {}

    def get_service_router(self) -> APIRouter | None:
        if self.active_service:
            return self.active_service.get_router()
        return None
