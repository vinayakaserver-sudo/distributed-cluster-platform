import os
import time
import uuid
import logging
import aiosqlite
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from agent.services import BaseService

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RegisterReq(BaseModel):
    username: str
    email: str
    password: str
    use_case: Optional[str] = "Full-stack web/mobile app"

class LoginReq(BaseModel):
    username: str
    password: str

class ValidateReq(BaseModel):
    token: str

class AuthService(BaseService):
    def __init__(self, config):
        self.config = config
        self.db_path = os.path.join(config.DATA_DIR, "users.db")
        self.router = APIRouter(prefix="/auth", tags=["Auth"])
        self.setup_routes()
        self.db = None
        self.jwt_secret = os.getenv("JWT_SECRET", "super-cluster-secret-998877")

    def setup_routes(self):
        @self.router.post("/register")
        async def register(req: RegisterReq):
            hashed = pwd_context.hash(req.password)
            user_id = str(uuid.uuid4())
            now = int(time.time())
            try:
                await self.db.execute(
                    "INSERT INTO users (id, username, email, password_hash, created_at, is_active, use_case) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (user_id, req.username, req.email, hashed, now, 1, req.use_case or "Web application")
                )
                await self.db.commit()

                # Attempt to provision isolated schema in Neon DB if DATABASE_URL configured
                if self.config.DATABASE_URL:
                    try:
                        import asyncpg
                        db_url = self.config.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace("postgres://", "postgresql://")
                        conn = await asyncpg.connect(db_url)
                        safe_user = "".join(c for c in req.username if c.isalnum() or c == "_")
                        await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "tenant_{safe_user}";')
                        await conn.close()
                        logger.info(f"Auto-provisioned isolated Neon DB schema: tenant_{safe_user}")
                    except Exception as pg_err:
                        logger.warning(f"Could not auto-provision schema on register: {pg_err}")

                return {
                    "user_id": user_id, 
                    "username": req.username,
                    "tenant_schema": f"tenant_{req.username}",
                    "email": req.email
                }
            except Exception as e:
                logger.error(f"Register error: {e}")
                raise HTTPException(400, "Username or email already exists")

        @self.router.post("/login")
        async def login(req: LoginReq):
            async with self.db.execute("SELECT id, password_hash, email FROM users WHERE username = ?", (req.username,)) as cursor:
                row = await cursor.fetchone()
                if not row or not pwd_context.verify(req.password, row[1]):
                    raise HTTPException(401, "Invalid username or password")
                
                token = jwt.encode(
                    {
                        "sub": row[0], 
                        "username": req.username, 
                        "email": row[2],
                        "schema": f"tenant_{req.username}",
                        "exp": int(time.time()) + 86400 * 7
                    }, 
                    self.jwt_secret, 
                    algorithm="HS256"
                )
                return {
                    "access_token": token, 
                    "token_type": "bearer", 
                    "expires_in": 86400 * 7,
                    "username": req.username,
                    "tenant_schema": f"tenant_{req.username}"
                }

        @self.router.post("/validate")
        async def validate(req: ValidateReq):
            try:
                payload = jwt.decode(req.token, self.jwt_secret, algorithms=["HS256"])
                return {
                    "valid": True, 
                    "user_id": payload["sub"], 
                    "username": payload["username"],
                    "schema": payload.get("schema", f"tenant_{payload['username']}")
                }
            except Exception:
                return {"valid": False}

        @self.router.get("/users")
        async def list_all_users():
            """Returns all registered developers / tenants for admin oversight"""
            async with self.db.execute("SELECT id, username, email, created_at, is_active, use_case FROM users ORDER BY created_at DESC") as cursor:
                rows = await cursor.fetchall()
                return {
                    "users": [
                        {
                            "id": r[0],
                            "username": r[1],
                            "email": r[2],
                            "created_at": r[3],
                            "is_active": bool(r[4]),
                            "use_case": r[5] or "Cloud Application",
                            "tenant_schema": f"tenant_{r[1]}"
                        }
                        for r in rows
                    ]
                }

        @self.router.get("/users/{user_id_or_name}")
        async def get_user(user_id_or_name: str):
            async with self.db.execute(
                "SELECT id, username, email, created_at, is_active, use_case FROM users WHERE id = ? OR username = ?", 
                (user_id_or_name, user_id_or_name)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(404, "User not found")
                return {
                    "id": row[0], 
                    "username": row[1], 
                    "email": row[2], 
                    "created_at": row[3], 
                    "is_active": bool(row[4]),
                    "use_case": row[5] or "Cloud Application",
                    "tenant_schema": f"tenant_{row[1]}"
                }

        @self.router.delete("/users/{user_id_or_name}")
        async def delete_user(user_id_or_name: str):
            """Deletes a developer account and purges their isolated database schema"""
            # 1. Fetch username to drop their schema
            username = None
            async with self.db.execute(
                "SELECT username FROM users WHERE id = ? OR username = ?", 
                (user_id_or_name, user_id_or_name)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    username = row[0]

            # 2. Delete from auth DB
            await self.db.execute("DELETE FROM users WHERE id = ? OR username = ?", (user_id_or_name, user_id_or_name))
            await self.db.commit()

            # 3. Drop isolated schema from Neon DB
            if username and self.config.DATABASE_URL:
                try:
                    import asyncpg
                    db_url = self.config.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace("postgres://", "postgresql://")
                    conn = await asyncpg.connect(db_url)
                    safe_user = "".join(c for c in username if c.isalnum() or c == "_")
                    await conn.execute(f'DROP SCHEMA IF EXISTS "tenant_{safe_user}" CASCADE;')
                    await conn.close()
                    logger.info(f"Purged isolated database schema: tenant_{safe_user}")
                except Exception as pg_err:
                    logger.warning(f"Could not purge schema on delete: {pg_err}")

            return {"status": "deleted", "username": username}

    async def start(self):
        os.makedirs(self.config.DATA_DIR, exist_ok=True)
        self.db = await aiosqlite.connect(self.db_path)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                email TEXT UNIQUE,
                password_hash TEXT,
                created_at INTEGER,
                is_active INTEGER,
                use_case TEXT DEFAULT 'Cloud Application'
            )
        """)
        # Safe migration if use_case column doesn't exist
        try:
            await self.db.execute("ALTER TABLE users ADD COLUMN use_case TEXT DEFAULT 'Cloud Application'")
        except Exception:
            pass
        await self.db.commit()
        logger.info("Auth service started with multi-tenant support")

    async def stop(self):
        if self.db:
            await self.db.close()

    def get_status(self) -> dict[str, bool]:
        return {"auth_db": self.db is not None, "jwt": True}

    def get_router(self) -> APIRouter:
        return self.router
