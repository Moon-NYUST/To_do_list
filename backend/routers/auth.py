# backend/routers/auth.py
import os
import base64
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional

from database import get_session
from models import User, UserCreate, UserResponse
import shutil
import uuid
from fastapi import UploadFile, File

# 設定
SECRET_KEY = "YOUR_SUPER_SECRET_KEY" # 實務上應從 getenv 讀取
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200 # 30天 (為了方便測試)

router = APIRouter(tags=["Authentication"])

from pydantic import BaseModel
class AvatarUpdate(BaseModel):
    avatar: str

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency: 從 Token 取得當前使用者
async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    if user is None:
        raise credentials_exception
    return user

# 註冊 API
@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, session: Session = Depends(get_session)):
    statement = select(User).where(User.username == user.username)
    if session.exec(statement).first():
        raise HTTPException(status_code=400, detail="使用者名稱已被註冊")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

# 登入 API
@router.post("/login")
def login(user: UserCreate, session: Session = Depends(get_session)):
    statement = select(User).where(User.username == user.username)
    db_user = session.exec(statement).first()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="帳號不存在或密碼錯誤")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "status": "success",
        "message": "登入成功",
        "username": db_user.username,
        "avatar": db_user.avatar,
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/update-avatar")
async def update_avatar(
    req: AvatarUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    current_user.avatar = req.avatar
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return {"status": "success", "avatar": current_user.avatar}

@router.post("/upload-avatar")
async def upload_avatar_file(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. 限制檔案大小 (例如 1MB)，避免資料庫過大
    MAX_SIZE = 1 * 1024 * 1024 # 1MB
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="圖片檔案太大了，請限制在 1MB 以內")

    # 2. 將圖片二進制內容轉換為 Base64 字串
    base64_encoded = base64.b64encode(contents).decode('utf-8')
    
    # 3. 組合為 Data URL 格式 (讓瀏覽器能直接讀取)
    mime_type = file.content_type  # 例如 image/jpeg
    avatar_data_url = f"data:{mime_type};base64,{base64_encoded}"
    
    # 4. 存入資料庫
    current_user.avatar = avatar_data_url
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {
        "status": "success", 
        "message": "頭像上傳成功", 
        "avatar": current_user.avatar
    }