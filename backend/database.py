from sqlmodel import SQLModel, create_engine, Session
from models import * # 確保模型已註冊
import os

# 1. 取得環境變數，如果沒有則使用本地 SQLite
database_url = os.getenv("DATABASE_URL", "sqlite:///todolist.db")

# 2. 處理 Render PostgreSQL 的網址格式相容性
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

# 3. 根據資料庫類型設定連線參數
# 如果是 SQLite 才需要 check_same_thread
if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {} # PostgreSQL 不需要那個參數

# 4. 建立引擎
if database_url.startswith("sqlite"):
    engine = create_engine(database_url, connect_args=connect_args)
else:
    # PostgreSQL 加入串接池設定，增加連線穩定性
    engine = create_engine(
        database_url, 
        connect_args=connect_args,
        pool_pre_ping=True,      # 每次連線前先測試
        pool_recycle=300         # 每 5 分鐘重啟連線，對應 Render 資料庫限制
    )

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session