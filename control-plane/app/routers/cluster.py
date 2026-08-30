from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import schemas, db
from app.db import get_db
from app.security import get_current_admin
from app.services.node_manager import NodeManager

router = APIRouter(prefix="/api/v1/cluster", tags=["cluster"])

@router.get("/stats", response_model=schemas.ClusterStats)
async def get_stats(session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    stats = await NodeManager.get_cluster_stats(session)
    return stats

@router.get("/logs")
async def get_cluster_logs(session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    result = await session.execute(
        select(db.NodeLog)
        .order_by(db.NodeLog.timestamp.desc())
        .limit(200)
    )
    logs = result.scalars().all()
    return logs

@router.get("/health")
async def health_check():
    return {"status": "ok"}
