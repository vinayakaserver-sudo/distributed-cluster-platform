import asyncpg
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agent.services import BaseService

logger = logging.getLogger(__name__)

class QueryRequest(BaseModel):
    sql: str
    params: list = []

class DBService(BaseService):
    def __init__(self, config, is_primary: bool):
        self.config = config
        self.is_primary = is_primary
        self.pool = None
        self.router = APIRouter(prefix="/db", tags=["Database"])
        self.setup_routes()
        
    def setup_routes(self):
        @self.router.post("/query")
        async def execute_query(req: QueryRequest):
            if not self.pool:
                raise HTTPException(503, "Database not connected")
            try:
                async with self.pool.acquire() as conn:
                    if req.sql.strip().upper().startswith("SELECT"):
                        records = await conn.fetch(req.sql, *req.params)
                        return {"results": [dict(r) for r in records]}
                    else:
                        if not self.is_primary:
                            raise HTTPException(403, "Cannot write to replica")
                        status = await conn.execute(req.sql, *req.params)
                        return {"status": status}
            except Exception as e:
                raise HTTPException(500, str(e))
                
        @self.router.get("/tables")
        async def list_tables():
            req = QueryRequest(sql="SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'")
            return await execute_query(req)
            
        @self.router.get("/status")
        async def db_status():
            return {"connected": self.pool is not None, "is_primary": self.is_primary}
            
        @self.router.post("/sync")
        async def sync_db():
            if self.is_primary:
                raise HTTPException(400, "Cannot sync primary")
            return {"status": "Sync triggered (mock)"}

    async def start(self):
        try:
            self.pool = await asyncpg.create_pool(dsn=self.config.DATABASE_URL)
            logger.info("Connected to PostgreSQL")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")

    async def stop(self):
        if self.pool:
            await self.pool.close()

    def get_status(self) -> dict[str, bool]:
        return {"postgres": self.pool is not None}

    def get_router(self) -> APIRouter:
        return self.router
