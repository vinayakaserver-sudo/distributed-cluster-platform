import os
import uuid
import logging
import aiosqlite
import aiofiles
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, RedirectResponse
from agent.services import BaseService

logger = logging.getLogger(__name__)

class FileService(BaseService):
    def __init__(self, config):
        self.config = config
        self.db_path = os.path.join(config.DATA_DIR, "files.db")
        self.router = APIRouter(prefix="/files", tags=["File Storage"])
        self.s3_client = None
        self.r2_enabled = False
        self.db = None
        self.files_count = 0
        self._init_s3()
        self.setup_routes()

    def _init_s3(self):
        if self.config.R2_ACCESS_KEY_ID and self.config.R2_SECRET_ACCESS_KEY and self.config.R2_BUCKET_NAME:
            try:
                import boto3
                endpoint_url = self.config.R2_ENDPOINT_URL
                if not endpoint_url and self.config.R2_ACCOUNT_ID:
                    endpoint_url = f"https://{self.config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=endpoint_url,
                    aws_access_key_id=self.config.R2_ACCESS_KEY_ID,
                    aws_secret_access_key=self.config.R2_SECRET_ACCESS_KEY,
                    region_name='auto'
                )
                self.r2_enabled = True
                logger.info(f"Cloudflare R2 storage enabled for bucket: {self.config.R2_BUCKET_NAME}")
            except Exception as e:
                logger.error(f"Failed to initialize Cloudflare R2 client: {e}")
                self.r2_enabled = False

    def setup_routes(self):
        @self.router.post("/upload")
        async def upload_file(file: UploadFile = File(...)):
            file_id = str(uuid.uuid4())
            filename = file.filename or "unnamed_file"
            s3_key = f"{file_id}_{filename}"
            size = 0

            if self.r2_enabled and self.s3_client:
                try:
                    # Read into memory/buffer and upload to R2
                    contents = await file.read()
                    size = len(contents)
                    
                    self.s3_client.put_object(
                        Bucket=self.config.R2_BUCKET_NAME,
                        Key=s3_key,
                        Body=contents,
                        ContentType=file.content_type or "application/octet-stream"
                    )
                    
                    public_url = (
                        f"{self.config.R2_PUBLIC_URL.rstrip('/')}/{s3_key}"
                        if self.config.R2_PUBLIC_URL
                        else f"/files/{file_id}"
                    )
                except Exception as e:
                    logger.error(f"R2 upload error: {e}")
                    raise HTTPException(500, f"Cloudflare R2 upload failed: {str(e)}")
            else:
                # Local disk fallback
                stored_path = os.path.join(self.config.DATA_DIR, s3_key)
                async with aiofiles.open(stored_path, 'wb') as out_file:
                    while chunk := await file.read(1024 * 1024):
                        await out_file.write(chunk)
                        size += len(chunk)
                public_url = f"/files/{file_id}"

            await self.db.execute(
                "INSERT INTO files (id, filename, size, s3_key, provider) VALUES (?, ?, ?, ?, ?)",
                (file_id, filename, size, s3_key, "cloudflare_r2" if self.r2_enabled else "local_disk")
            )
            await self.db.commit()
            self.files_count += 1

            return {
                "file_id": file_id,
                "filename": filename,
                "size": size,
                "provider": "cloudflare_r2" if self.r2_enabled else "local_disk",
                "url": public_url
            }

        @self.router.get("/{file_id}")
        async def download_file(file_id: str):
            async with self.db.execute("SELECT filename, s3_key, provider FROM files WHERE id = ?", (file_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(404, "File not found")
                filename, s3_key, provider = row

            if provider == "cloudflare_r2" and self.s3_client:
                try:
                    obj = self.s3_client.get_object(Bucket=self.config.R2_BUCKET_NAME, Key=s3_key)
                    return StreamingResponse(
                        obj['Body'].iter_chunks(),
                        media_type=obj.get('ContentType', 'application/octet-stream'),
                        headers={"Content-Disposition": f'inline; filename="{filename}"'}
                    )
                except Exception as e:
                    logger.error(f"R2 download error: {e}")
                    raise HTTPException(404, "File not found on Cloudflare R2")
            else:
                stored_path = os.path.join(self.config.DATA_DIR, s3_key)
                if not os.path.exists(stored_path):
                    raise HTTPException(404, "File missing on disk")

                def iterfile():
                    with open(stored_path, mode="rb") as f:
                        yield from f
                return StreamingResponse(iterfile(), media_type="application/octet-stream")

        @self.router.delete("/{file_id}")
        async def delete_file(file_id: str):
            async with self.db.execute("SELECT filename, s3_key, provider FROM files WHERE id = ?", (file_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(404, "File not found")
                filename, s3_key, provider = row

            if provider == "cloudflare_r2" and self.s3_client:
                try:
                    self.s3_client.delete_object(Bucket=self.config.R2_BUCKET_NAME, Key=s3_key)
                except Exception as e:
                    logger.error(f"R2 delete error: {e}")
            else:
                stored_path = os.path.join(self.config.DATA_DIR, s3_key)
                if os.path.exists(stored_path):
                    os.remove(stored_path)

            await self.db.execute("DELETE FROM files WHERE id = ?", (file_id,))
            await self.db.commit()
            self.files_count = max(0, self.files_count - 1)
            return {"status": "deleted", "file_id": file_id}

        @self.router.get("/")
        async def list_files():
            async with self.db.execute("SELECT id, filename, size, provider FROM files") as cursor:
                rows = await cursor.fetchall()
                return [
                    {"file_id": r[0], "filename": r[1], "size": r[2], "provider": r[3]}
                    for r in rows
                ]

        @self.router.get("/{file_id}/meta")
        async def file_meta(file_id: str):
            async with self.db.execute("SELECT id, filename, size, provider FROM files WHERE id = ?", (file_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(404, "File not found")
                return {"file_id": row[0], "filename": row[1], "size": row[2], "provider": row[3]}

    async def start(self):
        os.makedirs(self.config.DATA_DIR, exist_ok=True)
        self.db = await aiosqlite.connect(self.db_path)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                filename TEXT,
                size INTEGER,
                s3_key TEXT,
                provider TEXT
            )
        """)
        await self.db.commit()
        async with self.db.execute("SELECT COUNT(*) FROM files") as cursor:
            self.files_count = (await cursor.fetchone())[0]
        logger.info(f"File service started (R2 active: {self.r2_enabled})")

    async def stop(self):
        if self.db:
            await self.db.close()

    def get_status(self) -> dict[str, bool]:
        return {
            "storage": True,
            "cloudflare_r2": self.r2_enabled,
            "files_count": self.files_count
        }

    def get_router(self) -> APIRouter:
        return self.router
