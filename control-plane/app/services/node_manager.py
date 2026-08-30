import json
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app import db
from app import schemas
from app.security import generate_api_key
from app.config import settings

class NodeManager:
    @staticmethod
    async def register_node(req: schemas.NodeRegisterRequest, session: AsyncSession) -> tuple[db.Node, str]:
        raw_key, key_hash = generate_api_key()
        
        # Check if a node with the same name already exists
        result = await session.execute(select(db.Node).where(db.Node.name == req.name))
        existing_node = result.scalars().first()
        
        if existing_node:
            existing_node.node_type = req.node_type.value
            existing_node.status = schemas.NodeStatus.STARTING.value
            existing_node.host = req.host
            existing_node.port = req.port
            existing_node.region = req.region
            existing_node.version = req.version
            existing_node.tags = json.dumps(req.tags)
            
            # Update or recreate ApiKey
            key_result = await session.execute(select(db.ApiKey).where(db.ApiKey.node_id == existing_node.id))
            api_key = key_result.scalars().first()
            if api_key:
                api_key.key_hash = key_hash
            else:
                session.add(db.ApiKey(node_id=existing_node.id, key_hash=key_hash))
                
            await session.commit()
            await session.refresh(existing_node)
            return existing_node, raw_key
        
        # Create new node if not found
        node = db.Node(
            name=req.name,
            node_type=req.node_type.value,
            status=schemas.NodeStatus.STARTING.value,
            host=req.host,
            port=req.port,
            region=req.region,
            version=req.version,
            tags=json.dumps(req.tags),
            service_status="{}",
            errors="[]"
        )
        session.add(node)
        await session.flush()
        
        api_key = db.ApiKey(node_id=node.id, key_hash=key_hash)
        session.add(api_key)
        await session.commit()
        await session.refresh(node)
        
        return node, raw_key

    @staticmethod
    async def get_node(node_id: str, session: AsyncSession) -> db.Node | None:
        result = await session.execute(select(db.Node).where(db.Node.id == node_id))
        return result.scalars().first()

    @staticmethod
    async def list_nodes(session: AsyncSession) -> list[db.Node]:
        result = await session.execute(select(db.Node))
        return list(result.scalars().all())

    @staticmethod
    async def update_node_status(node_id: str, status: str, session: AsyncSession):
        node = await NodeManager.get_node(node_id, session)
        if node:
            node.status = status
            await session.commit()

    @staticmethod
    async def delete_node(node_id: str, session: AsyncSession):
        node = await NodeManager.get_node(node_id, session)
        if node:
            await session.execute(delete(db.ApiKey).where(db.ApiKey.node_id == node_id))
            await session.execute(delete(db.NodeMetric).where(db.NodeMetric.node_id == node_id))
            await session.execute(delete(db.NodeLog).where(db.NodeLog.node_id == node_id))
            await session.execute(delete(db.NodeCommand).where(db.NodeCommand.node_id == node_id))
            await session.delete(node)
            await session.commit()

    @staticmethod
    async def record_heartbeat(node_id: str, metrics: schemas.NodeMetrics, service_status: dict, errors: list, session: AsyncSession):
        node = await NodeManager.get_node(node_id, session)
        if not node:
            return
        
        node.last_heartbeat = datetime.datetime.utcnow()
        node.status = schemas.NodeStatus.ONLINE.value if not errors else schemas.NodeStatus.DEGRADED.value
        node.service_status = json.dumps(service_status)
        node.errors = json.dumps(errors)
        
        metric = db.NodeMetric(
            node_id=node.id,
            cpu_percent=metrics.cpu_percent,
            ram_percent=metrics.ram_percent,
            ram_used_mb=metrics.ram_used_mb,
            ram_total_mb=metrics.ram_total_mb,
            disk_percent=metrics.disk_percent,
            disk_used_gb=metrics.disk_used_gb,
            disk_total_gb=metrics.disk_total_gb,
            net_bytes_sent=metrics.net_bytes_sent,
            net_bytes_recv=metrics.net_bytes_recv,
            latency_ms=metrics.latency_ms,
            recorded_at=metrics.timestamp
        )
        session.add(metric)
        await session.commit()

    @staticmethod
    async def get_cluster_stats(session: AsyncSession) -> schemas.ClusterStats:
        nodes = await NodeManager.list_nodes(session)
        total_nodes = len(nodes)
        online = sum(1 for n in nodes if n.status == schemas.NodeStatus.ONLINE.value)
        offline = sum(1 for n in nodes if n.status == schemas.NodeStatus.OFFLINE.value)
        degraded = sum(1 for n in nodes if n.status == schemas.NodeStatus.DEGRADED.value)
        
        avg_cpu = 0.0
        avg_ram = 0.0
        tot_disk = 0.0
        used_disk = 0.0
        health = 100.0
        
        if total_nodes > 0:
            result = await session.execute(
                select(db.NodeMetric)
                .order_by(db.NodeMetric.recorded_at.desc())
                .limit(total_nodes) # approximate latest metrics per node
            )
            metrics = list(result.scalars().all())
            if metrics:
                avg_cpu = sum(m.cpu_percent for m in metrics) / len(metrics)
                avg_ram = sum(m.ram_percent for m in metrics) / len(metrics)
                tot_disk = sum(m.disk_total_gb for m in metrics)
                used_disk = sum(m.disk_used_gb for m in metrics)
            if total_nodes > 0:
                health = (online / total_nodes) * 100
        
        return schemas.ClusterStats(
            total_nodes=total_nodes,
            online_nodes=online,
            offline_nodes=offline,
            degraded_nodes=degraded,
            avg_cpu_percent=avg_cpu,
            avg_ram_percent=avg_ram,
            total_disk_gb=tot_disk,
            used_disk_gb=used_disk,
            cluster_health_score=health,
            updated_at=datetime.datetime.utcnow()
        )

    @staticmethod
    async def purge_old_metrics(session: AsyncSession):
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=settings.METRICS_RETENTION_HOURS)
        await session.execute(delete(db.NodeMetric).where(db.NodeMetric.recorded_at < cutoff))
        await session.commit()
