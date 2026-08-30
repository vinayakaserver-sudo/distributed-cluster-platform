import json
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app import schemas, db
from app.db import get_db
from app.security import get_current_admin, verify_api_key
from app.services.node_manager import NodeManager
from app.services.ws_manager import ws_manager
import uuid

router = APIRouter(prefix="/api/v1/nodes", tags=["nodes"])

async def get_node_info(node: db.Node) -> schemas.NodeInfo:
    return schemas.NodeInfo(
        node_id=node.id,
        name=node.name,
        node_type=schemas.NodeType(node.node_type),
        status=schemas.NodeStatus(node.status),
        host=node.host,
        port=node.port,
        region=node.region,
        version=node.version,
        tags=json.loads(node.tags) if node.tags else {},
        last_heartbeat=node.last_heartbeat,
        registered_at=node.registered_at,
        metrics=None,
        service_status=json.loads(node.service_status) if node.service_status else {},
        errors=json.loads(node.errors) if node.errors else []
    )

@router.post("/register", response_model=schemas.NodeRegisterResponse)
async def register_node(
    req: schemas.NodeRegisterRequest, 
    request: Request,
    x_api_key: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_db)
):
    node, raw_key = await NodeManager.register_node(req, session)
    # Simple ws url generation based on request url
    base_url = str(request.base_url).replace("http", "ws")
    ws_url = f"{base_url}ws/nodes/{node.id}?api_key={raw_key}"
    
    return schemas.NodeRegisterResponse(
        node_id=node.id,
        api_key=raw_key,
        control_plane_ws_url=ws_url,
        heartbeat_interval_seconds=10
    )

@router.get("", response_model=List[schemas.NodeInfo])
@router.get("/", response_model=List[schemas.NodeInfo])
async def list_nodes(session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    nodes = await NodeManager.list_nodes(session)
    return [await get_node_info(n) for n in nodes]

@router.get("/{node_id}", response_model=schemas.NodeInfo)
async def get_node(node_id: str, session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    node = await NodeManager.get_node(node_id, session)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return await get_node_info(node)

@router.delete("/{node_id}")
async def delete_node(node_id: str, session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    await NodeManager.delete_node(node_id, session)
    return {"status": "ok"}

@router.post("/{node_id}/command")
async def send_command(
    node_id: str, 
    command_req: dict, 
    session: AsyncSession = Depends(get_db), 
    admin: str = Depends(get_current_admin)
):
    node = await NodeManager.get_node(node_id, session)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    cmd_type = command_req.get("command_type", schemas.CommandType.PING.value)
    payload = command_req.get("payload", {})
    
    command = schemas.NodeCommand(
        command_id=str(uuid.uuid4()),
        command_type=schemas.CommandType(cmd_type),
        payload=payload,
        issued_by=admin
    )
    
    db_cmd = db.NodeCommand(
        id=command.command_id,
        node_id=node_id,
        command_type=command.command_type.value,
        payload=json.dumps(payload),
        status="pending",
        issued_by=admin
    )
    session.add(db_cmd)
    await session.commit()
    
    sent = await ws_manager.send_command_to_node(node_id, command)
    if sent:
        db_cmd.status = "sent"
        await session.commit()
        return {"status": "sent", "command_id": command.command_id}
    else:
        return {"status": "failed", "detail": "Node not connected via WS"}

@router.post("/{node_id}/heartbeat", response_model=schemas.HeartbeatResponse)
async def receive_heartbeat(
    node_id: str,
    heartbeat: schemas.HeartbeatRequest,
    x_api_key: str = Header(...),
    session: AsyncSession = Depends(get_db)
):
    # Verify API key
    result = await session.execute(select(db.ApiKey).where(db.ApiKey.node_id == node_id))
    api_key_record = result.scalars().first()
    if not api_key_record or not verify_api_key(x_api_key, api_key_record.key_hash):
        raise HTTPException(status_code=401, detail="Invalid API key")
        
    await NodeManager.record_heartbeat(node_id, heartbeat.metrics, heartbeat.service_status, heartbeat.errors, session)
    
    # Check pending commands
    cmds_result = await session.execute(
        select(db.NodeCommand)
        .where(db.NodeCommand.node_id == node_id)
        .where(db.NodeCommand.status == "pending")
    )
    pending_cmds_db = cmds_result.scalars().all()
    pending = []
    for c in pending_cmds_db:
        pending.append(schemas.NodeCommand(
            command_id=c.id,
            command_type=schemas.CommandType(c.command_type),
            payload=json.loads(c.payload),
            issued_by=c.issued_by
        ))
        c.status = "sent"
    await session.commit()
    
    return schemas.HeartbeatResponse(
        received=True,
        pending_commands=pending
    )

@router.get("/{node_id}/metrics")
async def get_node_metrics(node_id: str, session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    result = await session.execute(
        select(db.NodeMetric)
        .where(db.NodeMetric.node_id == node_id)
        .order_by(db.NodeMetric.recorded_at.desc())
        .limit(100)
    )
    metrics = result.scalars().all()
    return metrics

@router.get("/{node_id}/logs")
async def get_node_logs(node_id: str, session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    result = await session.execute(
        select(db.NodeLog)
        .where(db.NodeLog.node_id == node_id)
        .order_by(db.NodeLog.timestamp.desc())
        .limit(100)
    )
    logs = result.scalars().all()
    return logs

@router.put("/{node_id}/enable")
async def enable_node(node_id: str, session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    node = await NodeManager.get_node(node_id, session)
    if node:
        node.is_enabled = True
        node.status = schemas.NodeStatus.ONLINE.value
        await session.commit()
        await ws_manager.broadcast_node_status(node_id, node.status)
    return {"status": "ok"}

@router.put("/{node_id}/disable")
async def disable_node(node_id: str, session: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)):
    node = await NodeManager.get_node(node_id, session)
    if node:
        node.is_enabled = False
        node.status = schemas.NodeStatus.DISABLED.value
        await session.commit()
        await ws_manager.broadcast_node_status(node_id, node.status)
    return {"status": "ok"}
