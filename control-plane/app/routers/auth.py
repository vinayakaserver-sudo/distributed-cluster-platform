from fastapi import APIRouter, Depends, HTTPException, status
from app import schemas
from app.security import verify_password, create_access_token, get_current_admin, hash_password
from app.config import settings
from datetime import timedelta

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/login", response_model=schemas.AdminLoginResponse)
async def login(req: schemas.AdminLoginRequest):
    if req.username != settings.ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # In a real app we'd query db, here we check config
    if req.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    access_token = create_access_token(data={"sub": req.username})
    return schemas.AdminLoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRE_HOURS * 3600
    )

@router.get("/me")
async def get_me(username: str = Depends(get_current_admin)):
    return {"username": username}
