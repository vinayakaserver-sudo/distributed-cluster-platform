import uuid
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
import datetime
from .config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

class Node(Base):
    __tablename__ = "nodes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    node_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    region = Column(String, nullable=True)
    version = Column(String, nullable=False)
    tags = Column(Text, nullable=False) # JSON str
    last_heartbeat = Column(DateTime, nullable=True)
    registered_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_enabled = Column(Boolean, default=True)
    service_status = Column(Text, nullable=True) # JSON str
    errors = Column(Text, nullable=True) # JSON str

class NodeMetric(Base):
    __tablename__ = "node_metrics"
    id = Column(Integer, primary_key=True, autoincrement=True)
    node_id = Column(String, ForeignKey("nodes.id"), nullable=False)
    cpu_percent = Column(Float, default=0.0)
    ram_percent = Column(Float, default=0.0)
    ram_used_mb = Column(Float, default=0.0)
    ram_total_mb = Column(Float, default=0.0)
    disk_percent = Column(Float, default=0.0)
    disk_used_gb = Column(Float, default=0.0)
    disk_total_gb = Column(Float, default=0.0)
    net_bytes_sent = Column(Integer, default=0)
    net_bytes_recv = Column(Integer, default=0)
    latency_ms = Column(Float, default=0.0)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)

class NodeLog(Base):
    __tablename__ = "node_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    node_id = Column(String, ForeignKey("nodes.id"), nullable=True)
    level = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    source = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class NodeCommand(Base):
    __tablename__ = "node_commands"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    node_id = Column(String, nullable=False)
    command_type = Column(String, nullable=False)
    payload = Column(Text, nullable=False) # JSON str
    status = Column(String, nullable=False, default="pending")
    issued_by = Column(String, nullable=False)
    issued_at = Column(DateTime, default=datetime.datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)
    result = Column(Text, nullable=True) # JSON str

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, autoincrement=True)
    node_id = Column(String, ForeignKey("nodes.id"), nullable=False)
    key_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
