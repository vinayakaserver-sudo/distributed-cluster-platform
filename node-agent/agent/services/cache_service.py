import os
import uuid
import logging
from typing import Optional
import diskcache
from whoosh import index
from whoosh.fields import Schema, TEXT, ID, STORED
from whoosh.qparser import QueryParser
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agent.services import BaseService

logger = logging.getLogger(__name__)

class CacheItem(BaseModel):
    value: str
    ttl_seconds: Optional[int] = None

class SearchDoc(BaseModel):
    id: str
    title: str
    content: str
    metadata: str

class JobReq(BaseModel):
    type: str
    payload: dict

class CacheService(BaseService):
    def __init__(self, config):
        self.config = config
        self.cache_dir = config.CACHE_DIR
        self.search_dir = os.path.join(self.cache_dir, "search_index")
        self.cache = None
        self.ix = None
        self.jobs = {}
        self.router = APIRouter(tags=["Cache & Search"])
        self.setup_routes()

    def setup_routes(self):
        # Cache
        @self.router.get("/cache/{key}")
        def get_cache(key: str):
            val = self.cache.get(key)
            if val is None:
                raise HTTPException(404, "Key not found")
            return {"key": key, "value": val}

        @self.router.put("/cache/{key}")
        def set_cache(key: str, item: CacheItem):
            self.cache.set(key, item.value, expire=item.ttl_seconds)
            return {"status": "ok"}

        @self.router.delete("/cache/{key}")
        def delete_cache(key: str):
            self.cache.delete(key)
            return {"status": "deleted"}

        @self.router.get("/cache/")
        def list_cache():
            return {"keys": list(self.cache.iterkeys())}

        @self.router.delete("/cache/")
        def clear_cache():
            self.cache.clear()
            return {"status": "cleared"}

        # Search
        @self.router.post("/search/index")
        def index_doc(doc: SearchDoc):
            writer = self.ix.writer()
            writer.add_document(id=doc.id, title=doc.title, content=doc.content, meta=doc.metadata)
            writer.commit()
            return {"status": "indexed", "id": doc.id}

        @self.router.get("/search")
        def search_docs(q: str):
            with self.ix.searcher() as searcher:
                query = QueryParser("content", self.ix.schema).parse(q)
                results = searcher.search(query)
                return [{"id": r["id"], "title": r["title"], "meta": r.get("meta", "")} for r in results]

        @self.router.delete("/search/{doc_id}")
        def delete_doc(doc_id: str):
            writer = self.ix.writer()
            writer.delete_by_term('id', doc_id)
            writer.commit()
            return {"status": "deleted"}

        # Jobs
        @self.router.post("/jobs")
        def submit_job(req: JobReq):
            job_id = str(uuid.uuid4())
            self.jobs[job_id] = {"id": job_id, "type": req.type, "status": "pending", "payload": req.payload}
            return {"job_id": job_id}

        @self.router.get("/jobs/{job_id}")
        def get_job(job_id: str):
            if job_id not in self.jobs:
                raise HTTPException(404, "Job not found")
            return self.jobs[job_id]

        @self.router.get("/jobs/")
        def list_jobs():
            return list(self.jobs.values())

    async def start(self):
        os.makedirs(self.cache_dir, exist_ok=True)
        self.cache = diskcache.Cache(self.cache_dir)
        
        os.makedirs(self.search_dir, exist_ok=True)
        schema = Schema(id=ID(stored=True, unique=True), title=TEXT(stored=True), content=TEXT, meta=STORED)
        if not index.exists_in(self.search_dir):
            self.ix = index.create_in(self.search_dir, schema)
        else:
            self.ix = index.open_dir(self.search_dir)
            
        logger.info("Cache and search service started")

    async def stop(self):
        if self.cache:
            self.cache.close()
        if self.ix:
            self.ix.close()

    def get_status(self) -> dict[str, bool]:
        return {"cache": self.cache is not None, "search": self.ix is not None}

    def get_router(self) -> APIRouter:
        return self.router
