from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import json
import datetime
from app import db, schemas
from app.db import AsyncSessionLocal
from app.security import verify_api_key, verify_token
from app.services.ws_manager import ws_manager

router = APIRouter()

@router.websocket("/ws/nodes/{node_id}")
async def ws_node(websocket: WebSocket, node_id: str, api_key: str = Query(...)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(db.ApiKey).where(db.ApiKey.node_id == node_id))
        key_record = result.scalars().first()
        if not key_record or not verify_api_key(api_key, key_record.key_hash):
            await websocket.close(code=1008)
            return
            
    await ws_manager.connect_node(node_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = schemas.CommandResult.model_validate_json(data)
                # save result to db
                async with AsyncSessionLocal() as session:
                    cmd_res = await session.execute(
                        select(db.NodeCommand).where(db.NodeCommand.id == msg.command_id)
                    )
                    cmd = cmd_res.scalars().first()
                    if cmd:
                        cmd.status = "executed" if msg.success else "failed"
                        cmd.result = json.dumps({"output": msg.output, "error": msg.error})
                        cmd.executed_at = msg.executed_at
                        await session.commit()
            except Exception as e:
                print(f"Error parsing command result: {e}")
    except WebSocketDisconnect:
        ws_manager.disconnect_node(node_id)
        # Update node status
        async with AsyncSessionLocal() as session:
            node_res = await session.execute(select(db.Node).where(db.Node.id == node_id))
            node = node_res.scalars().first()
            if node and node.is_enabled:
                node.status = schemas.NodeStatus.OFFLINE.value
                await session.commit()
                await ws_manager.broadcast_node_status(node_id, node.status)

@router.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket, token: str = Query(...)):
    try:
        verify_token(token)
    except Exception:
        await websocket.close(code=1008)
        return
        
    await ws_manager.connect_dashboard(websocket)
    # Send initial snapshot
    async with AsyncSessionLocal() as session:
        from app.services.node_manager import NodeManager
        stats = await NodeManager.get_cluster_stats(session)
        await websocket.send_text(json.dumps({
            "type": "cluster_snapshot",
            "data": stats.model_dump(mode="json")
        }))
        
    try:
        while True:
            await websocket.receive_text() # wait for disconnect
    except WebSocketDisconnect:
        ws_manager.disconnect_dashboard(websocket)
