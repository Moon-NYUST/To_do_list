# backend/routers/auth.py
import os
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
    # 檢查路徑
    os.makedirs("uploads/avatars", exist_ok=True)
    
    # 產生安全檔名
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = f"uploads/avatars/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 回傳網址 (相對於前端)
    avatar_url = f"/uploads/avatars/{filename}"
    
    # 更新資料庫
    current_user.avatar = avatar_url
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {"status": "success", "avatar": avatar_url}