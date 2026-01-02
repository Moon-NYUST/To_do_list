from sqlmodel import SQLModel, create_engine, Session
from models import * # Import models to register them

import os

# 預設使用本地 SQLite，部屬時可透過 DATABASE_URL 切換 (轉成 SQLModel 格式)
database_url = os.getenv("DATABASE_URL", "sqlite:///todolist.db")

# 如果傳入的是 postgresql://，手動修正為 postgresql+psycopg2:// (如果需要)
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

sqlite_url = database_url

# check_same_thread=False is needed for SQLite with FastAPI
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
