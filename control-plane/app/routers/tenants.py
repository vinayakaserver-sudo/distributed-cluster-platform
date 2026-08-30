import httpx
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.security import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenants Management"])

AUTH_NODE_URL = "https://cluster-node-3.onrender.com"
DB_NODE_URL = "https://cluster-node-1.onrender.com"
FILE_NODE_URL = "https://cluster-node-4.onrender.com"

@router.get("")
@router.get("/")
async def list_all_tenants(
    admin: str = Depends(get_current_admin)
):
    """
    Super-admin endpoint: list all registered developers/tenants,
    their isolated database schemas, tables, and storage usage.
    """
    users = []
    schemas_overview = {}
    files_list = []

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Fetch all users from Auth Node
        try:
            res = await client.get(f"{AUTH_NODE_URL}/auth/users")
            if res.status_code == 200:
                users = res.json().get("users", [])
        except Exception as e:
            logger.warning(f"Could not fetch auth users: {e}")

        # 2. Fetch schema overview from DB Node
        try:
            res = await client.get(f"{DB_NODE_URL}/db/tenants/overview")
            if res.status_code == 200:
                for t in res.json().get("tenants", []):
                    schemas_overview[t["username"]] = t
        except Exception as e:
            logger.warning(f"Could not fetch schema overview: {e}")

        # 3. Fetch files from File Node
        try:
            res = await client.get(f"{FILE_NODE_URL}/files/")
            if res.status_code == 200:
                files_list = res.json()
        except Exception as e:
            logger.warning(f"Could not fetch files: {e}")

    # Combine data per tenant
    results = []
    for u in users:
        username = u["username"]
        schema_info = schemas_overview.get(username, {"table_count": 0, "total_bytes": 0})
        
        results.append({
            "id": u["id"],
            "username": username,
            "email": u["email"],
            "tenant_schema": f"tenant_{username}",
            "created_at": u["created_at"],
            "is_active": u["is_active"],
            "use_case": u.get("use_case", "Web application"),
            "table_count": schema_info.get("table_count", 0),
            "db_bytes": schema_info.get("total_bytes", 0),
            "files_count": len([f for f in files_list if username in str(f.get("filename", ""))]),
        })

    return results

@router.get("/{username}")
async def get_tenant_details(
    username: str,
    admin: str = Depends(get_current_admin)
):
    """
    Super-admin endpoint: inspect what a specific user has stored in their isolated database and storage.
    """
    tables = []
    files = []
    user_info = None

    async with httpx.AsyncClient(timeout=10.0) as client:
        # User metadata
        try:
            res = await client.get(f"{AUTH_NODE_URL}/auth/users/{username}")
            if res.status_code == 200:
                user_info = res.json()
        except Exception:
            pass

        # Tables in their schema
        try:
            res = await client.get(f"{DB_NODE_URL}/db/tables?schema={username}")
            if res.status_code == 200:
                tables = res.json().get("tables", [])
        except Exception:
            pass

        # Files
        try:
            res = await client.get(f"{FILE_NODE_URL}/files/")
            if res.status_code == 200:
                files = res.json()
        except Exception:
            pass

    return {
        "username": username,
        "tenant_schema": f"tenant_{username}",
        "user_info": user_info,
        "tables": tables,
        "files": files,
    }

@router.delete("/{username}")
async def delete_tenant(
    username: str,
    admin: str = Depends(get_current_admin)
):
    """
    Super-admin endpoint: delete user account, purge their database schema, and delete data.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Delete user in Auth Node (triggers schema drop)
        try:
            await client.delete(f"{AUTH_NODE_URL}/auth/users/{username}")
        except Exception as e:
            logger.warning(f"Auth delete error: {e}")

        # Explicitly ensure schema dropped in DB Node
        try:
            await client.delete(f"{DB_NODE_URL}/db/schemas/{username}/purge")
        except Exception as e:
            logger.warning(f"DB schema purge error: {e}")

    return {"status": "success", "message": f"Tenant {username} and isolated database schema successfully deleted and purged."}
