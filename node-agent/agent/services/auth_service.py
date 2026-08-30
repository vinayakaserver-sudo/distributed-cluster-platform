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
        self.pg_pool = None
        self.sqlite_db = None
        self.jwt_secret = os.getenv("JWT_SECRET", "super-cluster-secret-998877")
        self.setup_routes()

    def setup_routes(self):
        @self.router.post("/register")
        async def register(req: RegisterReq):
            hashed = pwd_context.hash(req.password)
            user_id = str(uuid.uuid4())
            now = int(time.time())
            safe_user = "".join(c for c in req.username if c.isalnum() or c == "_")

            if self.pg_pool:
                try:
                    async with self.pg_pool.acquire() as conn:
                        await conn.execute("""
                            INSERT INTO auth_users (id, username, email, password_hash, created_at, is_active, use_case)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """, user_id, req.username, req.email, hashed, now, True, req.use_case or "Web application")
                        
                        # Provision isolated tenant schema in PostgreSQL
                        await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "tenant_{safe_user}";')
                    
                    logger.info(f"Registered user {req.username} in permanent Neon DB and created schema tenant_{safe_user}")
                    return {
                        "user_id": user_id, 
                        "username": req.username,
                        "tenant_schema": f"tenant_{req.username}",
                        "email": req.email,
                        "storage": "permanent_neon_postgres"
                    }
                except Exception as e:
                    logger.error(f"PostgreSQL Register error: {e}")
                    raise HTTPException(400, "Username or email already exists")
            else:
                # Local SQLite Fallback
                try:
                    await self.sqlite_db.execute(
                        "INSERT INTO users (id, username, email, password_hash, created_at, is_active, use_case) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (user_id, req.username, req.email, hashed, now, 1, req.use_case or "Web application")
                    )
                    await self.sqlite_db.commit()
                    return {
                        "user_id": user_id, 
                        "username": req.username,
                        "tenant_schema": f"tenant_{req.username}",
                        "email": req.email,
                        "storage": "local_sqlite"
                    }
                except Exception as e:
                    raise HTTPException(400, "Username or email already exists")

        @self.router.post("/login")
        async def login(req: LoginReq):
            row = None
            if self.pg_pool:
                try:
                    async with self.pg_pool.acquire() as conn:
                        row = await conn.fetchrow("SELECT id, password_hash, email FROM auth_users WHERE username = $1", req.username)
                except Exception as e:
                    logger.error(f"PG Login query error: {e}")
            elif self.sqlite_db:
                async with self.sqlite_db.execute("SELECT id, password_hash, email FROM users WHERE username = ?", (req.username,)) as cursor:
                    row = await cursor.fetchone()

            if not row:
                raise HTTPException(401, "Invalid username or password")
            
            pwd_hash = row['password_hash'] if self.pg_pool else row[1]
            user_id = row['id'] if self.pg_pool else row[0]
            email = row['email'] if self.pg_pool else row[2]

            if not pwd_context.verify(req.password, pwd_hash):
                raise HTTPException(401, "Invalid username or password")
            
            token = jwt.encode(
                {
                    "sub": user_id, 
                    "username": req.username, 
                    "email": email,
                    "schema": f"tenant_{req.username}",
                    "exp": int(time.time()) + 86400 * 30  # 30 days session
                }, 
                self.jwt_secret, 
                algorithm="HS256"
            )
            return {
                "access_token": token, 
                "token_type": "bearer", 
                "expires_in": 86400 * 30,
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
            if self.pg_pool:
                try:
                    async with self.pg_pool.acquire() as conn:
                        rows = await conn.fetch("SELECT id, username, email, created_at, is_active, use_case FROM auth_users ORDER BY created_at DESC")
                        return {
                            "users": [
                                {
                                    "id": r['id'],
                                    "username": r['username'],
                                    "email": r['email'],
                                    "created_at": r['created_at'],
                                    "is_active": r['is_active'],
                                    "use_case": r['use_case'] or "Cloud Application",
                                    "tenant_schema": f"tenant_{r['username']}"
                                }
                                for r in rows
                            ]
                        }
                except Exception as e:
                    logger.error(f"PG list users error: {e}")
                    return {"users": []}
            else:
                if self.sqlite_db:
                    async with self.sqlite_db.execute("SELECT id, username, email, created_at, is_active, use_case FROM users ORDER BY created_at DESC") as cursor:
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
                return {"users": []}

        @self.router.get("/users/{user_id_or_name}")
        async def get_user(user_id_or_name: str):
            if self.pg_pool:
                async with self.pg_pool.acquire() as conn:
                    row = await conn.fetchrow(
                        "SELECT id, username, email, created_at, is_active, use_case FROM auth_users WHERE id = $1 OR username = $1", 
                        user_id_or_name
                    )
                    if not row:
                        raise HTTPException(404, "User not found")
                    return {
                        "id": row['id'], 
                        "username": row['username'], 
                        "email": row['email'], 
                        "created_at": row['created_at'], 
                        "is_active": row['is_active'],
                        "use_case": row['use_case'] or "Cloud Application",
                        "tenant_schema": f"tenant_{row['username']}"
                    }
            else:
                if self.sqlite_db:
                    async with self.sqlite_db.execute(
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
                raise HTTPException(404, "User not found")

        @self.router.delete("/users/{user_id_or_name}")
        async def delete_user(user_id_or_name: str):
            """Deletes a developer account and purges their isolated database schema"""
            username = None
            if self.pg_pool:
                try:
                    async with self.pg_pool.acquire() as conn:
                        row = await conn.fetchrow(
                            "SELECT username FROM auth_users WHERE id = $1 OR username = $1", 
                            user_id_or_name
                        )
                        if row:
                            username = row['username']
                            await conn.execute("DELETE FROM auth_users WHERE id = $1 OR username = $1", user_id_or_name)
                            safe_user = "".join(c for c in username if c.isalnum() or c == "_")
                            await conn.execute(f'DROP SCHEMA IF EXISTS "tenant_{safe_user}" CASCADE;')
                            logger.info(f"Purged isolated database schema in Neon: tenant_{safe_user}")
                except Exception as e:
                    logger.error(f"PG delete user error: {e}")
            elif self.sqlite_db:
                async with self.sqlite_db.execute(
                    "SELECT username FROM users WHERE id = ? OR username = ?", 
                    (user_id_or_name, user_id_or_name)
                ) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        username = row[0]
                await self.sqlite_db.execute("DELETE FROM users WHERE id = ? OR username = ?", (user_id_or_name, user_id_or_name))
                await self.sqlite_db.commit()

            return {"status": "deleted", "username": username}

    async def start(self):
        # 1. Connect to Neon PostgreSQL if DATABASE_URL configured (Permanent Cloud Storage)
        if self.config.DATABASE_URL:
            try:
                import asyncpg
                db_url = self.config.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace("postgres://", "postgresql://")
                self.pg_pool = await asyncpg.create_pool(db_url, min_size=1, max_size=5)
                async with self.pg_pool.acquire() as conn:
                    await conn.execute("""
                        CREATE TABLE IF NOT EXISTS auth_users (
                            id VARCHAR(64) PRIMARY KEY,
                            username VARCHAR(64) UNIQUE NOT NULL,
                            email VARCHAR(128) UNIQUE NOT NULL,
                            password_hash TEXT NOT NULL,
                            created_at BIGINT NOT NULL,
                            is_active BOOLEAN DEFAULT TRUE,
                            use_case TEXT DEFAULT 'Cloud Application'
                        );
                    """)
                logger.info("Auth service connected to permanent Neon PostgreSQL database")
                return
            except Exception as e:
                logger.error(f"Failed to connect Auth service to Neon PostgreSQL: {e}. Falling back to SQLite.")
                self.pg_pool = None

        # 2. Local SQLite Fallback
        os.makedirs(self.config.DATA_DIR, exist_ok=True)
        self.sqlite_db = await aiosqlite.connect(self.db_path)
        await self.sqlite_db.execute("""
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
        await self.sqlite_db.commit()
        logger.info("Auth service started with local SQLite fallback")

    async def stop(self):
        if self.pg_pool:
            await self.pg_pool.close()
        if self.sqlite_db:
            await self.sqlite_db.close()

    def get_status(self) -> dict[str, bool]:
        return {
            "auth_db": (self.pg_pool is not None) or (self.sqlite_db is not None),
            "neon_postgres": self.pg_pool is not None,
            "jwt": True
        }

    def get_router(self) -> APIRouter:
        return self.router
