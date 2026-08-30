import os
import time
import uuid
import logging
import aiosqlite
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
        self.jwt_secret = os.getenv("JWT_SECRET", "default_secret")

    def setup_routes(self):
        @self.router.post("/register")
        async def register(req: RegisterReq):
            hashed = pwd_context.hash(req.password)
            user_id = str(uuid.uuid4())
            try:
                await self.db.execute(
                    "INSERT INTO users (id, username, email, password_hash, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?)",
                    (user_id, req.username, req.email, hashed, int(time.time()), 1)
                )
                await self.db.commit()
                return {"user_id": user_id, "username": req.username}
            except Exception as e:
                raise HTTPException(400, "Username or email already exists")

        @self.router.post("/login")
        async def login(req: LoginReq):
            async with self.db.execute("SELECT id, password_hash FROM users WHERE username = ?", (req.username,)) as cursor:
                row = await cursor.fetchone()
                if not row or not pwd_context.verify(req.password, row[1]):
                    raise HTTPException(401, "Invalid credentials")
                
                token = jwt.encode({"sub": row[0], "username": req.username, "exp": int(time.time()) + 86400}, self.jwt_secret, algorithm="HS256")
                return {"access_token": token, "token_type": "bearer", "expires_in": 86400}

        @self.router.post("/validate")
        async def validate(req: ValidateReq):
            try:
                payload = jwt.decode(req.token, self.jwt_secret, algorithms=["HS256"])
                return {"valid": True, "user_id": payload["sub"], "username": payload["username"]}
            except Exception:
                return {"valid": False}

        @self.router.get("/users/{user_id}")
        async def get_user(user_id: str):
            async with self.db.execute("SELECT id, username, email, created_at, is_active FROM users WHERE id = ?", (user_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(404, "User not found")
                return {"id": row[0], "username": row[1], "email": row[2], "created_at": row[3], "is_active": bool(row[4])}

        @self.router.delete("/users/{user_id}")
        async def delete_user(user_id: str):
            await self.db.execute("DELETE FROM users WHERE id = ?", (user_id,))
            await self.db.commit()
            return {"status": "deleted"}

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
                is_active INTEGER
            )
        """)
        await self.db.commit()
        logger.info("Auth service started")

    async def stop(self):
        if self.db:
            await self.db.close()

    def get_status(self) -> dict[str, bool]:
        return {"auth_db": self.db is not None, "jwt": True}

    def get_router(self) -> APIRouter:
        return self.router
