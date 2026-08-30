import os
import uuid
import logging
import aiosqlite
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from agent.services import BaseService

logger = logging.getLogger(__name__)

class FileService(BaseService):
    def __init__(self, config):
        self.config = config
        self.db_path = os.path.join(config.DATA_DIR, "files.db")
        self.router = APIRouter(prefix="/files", tags=["File Storage"])
        self.setup_routes()
        self.db = None
        self.files_count = 0

    def setup_routes(self):
        @self.router.post("/upload")
        async def upload_file(file: UploadFile = File(...)):
            file_id = str(uuid.uuid4())
            filename = file.filename
            stored_path = os.path.join(self.config.DATA_DIR, f"{file_id}_{filename}")
            
            size = 0
            async with aiofiles.open(stored_path, 'wb') as out_file:
                while content := await file.read(1024 * 1024):
                    await out_file.write(content)
                    size += len(content)
            
            await self.db.execute("INSERT INTO files (id, filename, size) VALUES (?, ?, ?)", (file_id, filename, size))
            await self.db.commit()
            self.files_count += 1
            
            return {"file_id": file_id, "filename": filename, "size": size, "url": f"/files/{file_id}"}

        @self.router.get("/{file_id}")
        async def download_file(file_id: str):
            async with self.db.execute("SELECT filename FROM files WHERE id = ?", (file_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(404, "File not found")
                
            stored_path = os.path.join(self.config.DATA_DIR, f"{file_id}_{row[0]}")
            if not os.path.exists(stored_path):
                raise HTTPException(404, "File missing on disk")
                
            def iterfile():
                with open(stored_path, mode="rb") as f:
                    yield from f
            return StreamingResponse(iterfile(), media_type="application/octet-stream")

        @self.router.delete("/{file_id}")
        async def delete_file(file_id: str):
            async with self.db.execute("SELECT filename FROM files WHERE id = ?", (file_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(404, "File not found")
                    
            stored_path = os.path.join(self.config.DATA_DIR, f"{file_id}_{row[0]}")
            if os.path.exists(stored_path):
                os.remove(stored_path)
                
            await self.db.execute("DELETE FROM files WHERE id = ?", (file_id,))
            await self.db.commit()
            self.files_count = max(0, self.files_count - 1)
            return {"status": "deleted"}

        @self.router.get("/")
        async def list_files():
            async with self.db.execute("SELECT id, filename, size FROM files") as cursor:
                rows = await cursor.fetchall()
                return [{"file_id": r[0], "filename": r[1], "size": r[2]} for r in rows]

        @self.router.get("/{file_id}/meta")
        async def file_meta(file_id: str):
            async with self.db.execute("SELECT id, filename, size FROM files WHERE id = ?", (file_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(404, "File not found")
                return {"file_id": row[0], "filename": row[1], "size": row[2]}

    async def start(self):
        os.makedirs(self.config.DATA_DIR, exist_ok=True)
        self.db = await aiosqlite.connect(self.db_path)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                filename TEXT,
                size INTEGER
            )
        """)
        await self.db.commit()
        async with self.db.execute("SELECT COUNT(*) FROM files") as cursor:
            self.files_count = (await cursor.fetchone())[0]
        logger.info("File service started")

    async def stop(self):
        if self.db:
            await self.db.close()

    def get_status(self) -> dict[str, bool]:
        return {"storage": self.db is not None, "files_count": self.files_count}

    def get_router(self) -> APIRouter:
        return self.router
