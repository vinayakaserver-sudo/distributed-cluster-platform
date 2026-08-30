import os
import uuid
import logging
import aiosqlite
import aiofiles
from io import BytesIO
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, Response
from agent.services import BaseService

logger = logging.getLogger(__name__)

class FileService(BaseService):
    def __init__(self, config):
        self.config = config
        self.db_path = os.path.join(config.DATA_DIR, "files.db")
        self.router = APIRouter(prefix="/files", tags=["File Storage"])
        self.pg_pool = None
        self.sqlite_db = None
        self.files_count = 0
        self.setup_routes()

    def setup_routes(self):
        @self.router.post("/upload")
        async def upload_file(file: UploadFile = File(...)):
            file_id = str(uuid.uuid4())
            filename = file.filename or "unnamed_file"
            content_type = file.content_type or "application/octet-stream"
            contents = await file.read()
            size = len(contents)

            if self.pg_pool:
                try:
                    async with self.pg_pool.acquire() as conn:
                        await conn.execute("""
                            INSERT INTO files_storage (id, filename, content_type, size, data)
                            VALUES ($1, $2, $3, $4, $5)
                        """, file_id, filename, content_type, size, contents)
                    self.files_count += 1
                    return {
                        "file_id": file_id,
                        "filename": filename,
                        "size": size,
                        "content_type": content_type,
                        "provider": "neon_postgres",
                        "url": f"/files/{file_id}"
                    }
                except Exception as e:
                    logger.error(f"Neon file upload error: {e}")
                    raise HTTPException(500, f"Neon DB upload failed: {str(e)}")
            else:
                # Local disk fallback
                stored_path = os.path.join(self.config.DATA_DIR, f"{file_id}_{filename}")
                async with aiofiles.open(stored_path, 'wb') as out_file:
                    await out_file.write(contents)

                if self.sqlite_db:
                    await self.sqlite_db.execute(
                        "INSERT INTO files (id, filename, size, content_type) VALUES (?, ?, ?, ?)",
                        (file_id, filename, size, content_type)
                    )
                    await self.sqlite_db.commit()
                self.files_count += 1

                return {
                    "file_id": file_id,
                    "filename": filename,
                    "size": size,
                    "content_type": content_type,
                    "provider": "local_disk",
                    "url": f"/files/{file_id}"
                }

        @self.router.get("/{file_id}")
        async def download_file(file_id: str):
            if self.pg_pool:
                try:
                    async with self.pg_pool.acquire() as conn:
                        row = await conn.fetchrow(
                            "SELECT filename, content_type, data FROM files_storage WHERE id = $1",
                            file_id
                        )
                        if not row:
                            raise HTTPException(404, "File not found in Neon database")
                        
                        filename = row['filename']
                        content_type = row['content_type']
                        data = row['data']

                    return Response(
                        content=bytes(data),
                        media_type=content_type,
                        headers={"Content-Disposition": f'inline; filename="{filename}"'}
                    )
                except HTTPException:
                    raise
                except Exception as e:
                    logger.error(f"Neon file download error: {e}")
                    raise HTTPException(500, f"Neon DB download failed: {str(e)}")
            else:
                # Local disk download
                async with self.sqlite_db.execute("SELECT filename, content_type FROM files WHERE id = ?", (file_id,)) as cursor:
                    row = await cursor.fetchone()
                    if not row:
                        raise HTTPException(404, "File not found")
                    filename, content_type = row[0], row[1] if len(row) > 1 else "application/octet-stream"

                stored_path = os.path.join(self.config.DATA_DIR, f"{file_id}_{filename}")
                if not os.path.exists(stored_path):
                    raise HTTPException(404, "File missing on disk")

                def iterfile():
                    with open(stored_path, mode="rb") as f:
                        yield from f
                return StreamingResponse(iterfile(), media_type=content_type, headers={"Content-Disposition": f'inline; filename="{filename}"'})

        @self.router.delete("/{file_id}")
        async def delete_file(file_id: str):
            if self.pg_pool:
                try:
                    async with self.pg_pool.acquire() as conn:
                        res = await conn.execute("DELETE FROM files_storage WHERE id = $1", file_id)
                    self.files_count = max(0, self.files_count - 1)
                    return {"status": "deleted", "file_id": file_id, "provider": "neon_postgres"}
                except Exception as e:
                    logger.error(f"Neon file delete error: {e}")
                    raise HTTPException(500, f"Neon DB delete failed: {str(e)}")
            else:
                async with self.sqlite_db.execute("SELECT filename FROM files WHERE id = ?", (file_id,)) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        stored_path = os.path.join(self.config.DATA_DIR, f"{file_id}_{row[0]}")
                        if os.path.exists(stored_path):
                            os.remove(stored_path)
                        await self.sqlite_db.execute("DELETE FROM files WHERE id = ?", (file_id,))
                        await self.sqlite_db.commit()
                self.files_count = max(0, self.files_count - 1)
                return {"status": "deleted", "file_id": file_id, "provider": "local_disk"}

        @self.router.get("/")
        async def list_files():
            if self.pg_pool:
                try:
                    async with self.pg_pool.acquire() as conn:
                        rows = await conn.fetch("""
                            SELECT id, filename, content_type, size, created_at 
                            FROM files_storage 
                            ORDER BY created_at DESC 
                            LIMIT 100
                        """)
                        return [
                            {
                                "file_id": r['id'],
                                "filename": r['filename'],
                                "content_type": r['content_type'],
                                "size": r['size'],
                                "created_at": str(r['created_at']),
                                "provider": "neon_postgres"
                            }
                            for r in rows
                        ]
                except Exception as e:
                    logger.error(f"Neon list files error: {e}")
                    return []
            else:
                if self.sqlite_db:
                    async with self.sqlite_db.execute("SELECT id, filename, size FROM files") as cursor:
                        rows = await cursor.fetchall()
                        return [{"file_id": r[0], "filename": r[1], "size": r[2], "provider": "local_disk"} for r in rows]
                return []

        @self.router.get("/{file_id}/meta")
        async def file_meta(file_id: str):
            if self.pg_pool:
                async with self.pg_pool.acquire() as conn:
                    row = await conn.fetchrow(
                        "SELECT id, filename, content_type, size, created_at FROM files_storage WHERE id = $1",
                        file_id
                    )
                    if not row:
                        raise HTTPException(404, "File not found")
                    return {
                        "file_id": row['id'],
                        "filename": row['filename'],
                        "content_type": row['content_type'],
                        "size": row['size'],
                        "created_at": str(row['created_at']),
                        "provider": "neon_postgres"
                    }
            else:
                async with self.sqlite_db.execute("SELECT id, filename, size FROM files WHERE id = ?", (file_id,)) as cursor:
                    row = await cursor.fetchone()
                    if not row:
                        raise HTTPException(404, "File not found")
                    return {"file_id": row[0], "filename": row[1], "size": row[2], "provider": "local_disk"}

    async def start(self):
        # 1. Connect to Neon PostgreSQL if DATABASE_URL is configured
        if self.config.DATABASE_URL:
            try:
                import asyncpg
                db_url = self.config.DATABASE_URL
                # Normalize asyncpg url
                if db_url.startswith("postgresql+asyncpg://"):
                    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
                elif db_url.startswith("postgres://"):
                    db_url = db_url.replace("postgres://", "postgresql://")

                self.pg_pool = await asyncpg.create_pool(db_url, min_size=1, max_size=5, timeout=10.0)
                async with self.pg_pool.acquire() as conn:
                    await conn.execute("""
                        CREATE TABLE IF NOT EXISTS files_storage (
                            id VARCHAR(64) PRIMARY KEY,
                            filename TEXT NOT NULL,
                            content_type TEXT NOT NULL,
                            size BIGINT NOT NULL,
                            data BYTEA NOT NULL,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    row = await conn.fetchrow("SELECT COUNT(*) FROM files_storage")
                    self.files_count = row[0] if row else 0
                logger.info(f"Node 4 FileService connected to Neon PostgreSQL (Total files: {self.files_count})")
                return
            except Exception as e:
                logger.error(f"Failed to connect FileService to Neon PostgreSQL: {e}. Falling back to local disk.")
                self.pg_pool = None

        # 2. Fallback to Local Disk + SQLite
        os.makedirs(self.config.DATA_DIR, exist_ok=True)
        self.sqlite_db = await aiosqlite.connect(self.db_path)
        await self.sqlite_db.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                filename TEXT,
                size INTEGER,
                content_type TEXT DEFAULT 'application/octet-stream'
            )
        """)
        await self.sqlite_db.commit()
        async with self.sqlite_db.execute("SELECT COUNT(*) FROM files") as cursor:
            self.files_count = (await cursor.fetchone())[0]
        logger.info(f"Node 4 FileService started with local disk storage (Total files: {self.files_count})")

    async def stop(self):
        if self.pg_pool:
            await self.pg_pool.close()
        if self.sqlite_db:
            await self.sqlite_db.close()

    def get_status(self) -> dict[str, bool]:
        return {
            "storage": True,
            "neon_postgres": self.pg_pool is not None,
            "files_count": self.files_count
        }

    def get_router(self) -> APIRouter:
        return self.router
