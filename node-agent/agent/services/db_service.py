import asyncpg
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from agent.services import BaseService

logger = logging.getLogger(__name__)

class QueryRequest(BaseModel):
    sql: str
    params: list = []
    schema_name: Optional[str] = None

class DBService(BaseService):
    def __init__(self, config, is_primary: bool):
        self.config = config
        self.is_primary = is_primary
        self.pool = None
        self.router = APIRouter(prefix="/db", tags=["Database"])
        self.setup_routes()
        
    def setup_routes(self):
        @self.router.post("/query")
        async def execute_query(
            req: QueryRequest,
            x_tenant_schema: Optional[str] = Header(None)
        ):
            if not self.pool:
                raise HTTPException(503, "Database not connected")
            
            target_schema = req.schema_name or x_tenant_schema
            try:
                async with self.pool.acquire() as conn:
                    # If target schema specified, isolate query to that tenant schema
                    if target_schema:
                        safe_schema = "".join(c for c in target_schema if c.isalnum() or c == "_")
                        schema_name = f"tenant_{safe_schema}" if not safe_schema.startswith("tenant_") else safe_schema
                        await conn.execute(f'SET search_path TO "{schema_name}", public;')

                    sql_clean = req.sql.strip().upper()
                    if sql_clean.startswith("SELECT") or sql_clean.startswith("SHOW") or sql_clean.startswith("EXPLAIN"):
                        records = await conn.fetch(req.sql, *req.params)
                        return {
                            "rows": [dict(r) for r in records],
                            "count": len(records),
                            "schema": target_schema or "public"
                        }
                    else:
                        if not self.is_primary:
                            raise HTTPException(403, "Cannot write to replica DB")
                        status = await conn.execute(req.sql, *req.params)
                        return {"status": status, "schema": target_schema or "public"}
            except Exception as e:
                logger.error(f"Database query execution error: {e}")
                raise HTTPException(500, str(e))
                
        @self.router.get("/tables")
        async def list_tables(schema: Optional[str] = Query(None)):
            if not self.pool:
                raise HTTPException(503, "Database not connected")
            try:
                target_schema = f"tenant_{schema}" if schema and not schema.startswith("tenant_") else (schema or "public")
                async with self.pool.acquire() as conn:
                    rows = await conn.fetch("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = $1 AND table_type = 'BASE TABLE'
                        ORDER BY table_name;
                    """, target_schema)
                    return {"tables": [r['table_name'] for r in rows], "schema": target_schema}
            except Exception as e:
                raise HTTPException(500, str(e))

        @self.router.post("/schemas/{username}/provision")
        async def provision_tenant_schema(username: str):
            """Creates a brand new isolated PostgreSQL schema for a developer"""
            if not self.pool:
                raise HTTPException(503, "Database not connected")
            safe_user = "".join(c for c in username if c.isalnum() or c == "_")
            schema_name = f"tenant_{safe_user}"
            try:
                async with self.pool.acquire() as conn:
                    await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}";')
                    logger.info(f"Provisioned isolated PostgreSQL schema: {schema_name}")
                    return {"status": "provisioned", "schema": schema_name}
            except Exception as e:
                raise HTTPException(500, f"Failed to provision schema: {e}")

        @self.router.delete("/schemas/{username}/purge")
        async def purge_tenant_schema(username: str):
            """Drops tenant's isolated schema and all its tables cleanly"""
            if not self.pool:
                raise HTTPException(503, "Database not connected")
            safe_user = "".join(c for c in username if c.isalnum() or c == "_")
            schema_name = f"tenant_{safe_user}"
            try:
                async with self.pool.acquire() as conn:
                    await conn.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
                    logger.info(f"Purged isolated PostgreSQL schema: {schema_name}")
                    return {"status": "purged", "schema": schema_name}
            except Exception as e:
                raise HTTPException(500, f"Failed to purge schema: {e}")

        @self.router.get("/tenants/overview")
        async def get_all_tenants_overview():
            """Returns list of all tenant schemas with table counts and storage size"""
            if not self.pool:
                raise HTTPException(503, "Database not connected")
            try:
                async with self.pool.acquire() as conn:
                    rows = await conn.fetch("""
                        SELECT 
                            n.nspname AS schema_name,
                            COUNT(c.relname) AS table_count,
                            COALESCE(SUM(pg_total_relation_size(c.oid)), 0) AS total_bytes
                        FROM pg_namespace n
                        LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relkind = 'r'
                        WHERE n.nspname LIKE 'tenant_%'
                        GROUP BY n.nspname
                        ORDER BY n.nspname;
                    """)
                    return {
                        "tenants": [
                            {
                                "schema_name": r['schema_name'],
                                "username": r['schema_name'].replace("tenant_", ""),
                                "table_count": r['table_count'],
                                "total_bytes": r['total_bytes']
                            }
                            for r in rows
                        ]
                    }
            except Exception as e:
                raise HTTPException(500, str(e))

        @self.router.get("/status")
        async def db_status():
            return {"connected": self.pool is not None, "is_primary": self.is_primary}

    async def start(self):
        if self.config.DATABASE_URL:
            try:
                db_url = self.config.DATABASE_URL
                if db_url.startswith("postgresql+asyncpg://"):
                    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
                elif db_url.startswith("postgres://"):
                    db_url = db_url.replace("postgres://", "postgresql://")

                self.pool = await asyncpg.create_pool(dsn=db_url, min_size=1, max_size=5)
                logger.info(f"Connected to PostgreSQL ({'Primary' if self.is_primary else 'Replica'})")
            except Exception as e:
                logger.error(f"Failed to connect to PostgreSQL: {e}")

    async def stop(self):
        if self.pool:
            await self.pool.close()

    def get_status(self) -> dict[str, bool]:
        return {"postgres": self.pool is not None}

    def get_router(self) -> APIRouter:
        return self.router
