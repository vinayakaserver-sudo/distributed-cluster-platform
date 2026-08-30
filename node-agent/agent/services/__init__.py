from abc import ABC, abstractmethod
from fastapi import APIRouter

class BaseService(ABC):
    @abstractmethod
    async def start(self):
        pass
        
    @abstractmethod
    async def stop(self):
        pass
        
    @abstractmethod
    def get_status(self) -> dict[str, bool]:
        pass
        
    @abstractmethod
    def get_router(self) -> APIRouter:
        pass
