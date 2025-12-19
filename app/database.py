from typing import List
from app.models import Attendance, PersonalTask, TeamTask, Message

# -------------------------------
# 打卡紀錄
# -------------------------------
attendances: List[Attendance] = []

# -------------------------------
# 個人任務列表
# -------------------------------
personal_tasks: List[PersonalTask] = []

# -------------------------------
# 團隊任務列表
# -------------------------------
team_tasks: List[TeamTask] = []

# -------------------------------
# 聊天室訊息列表
# -------------------------------
messages: List[Message] = []


from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

DATABASE_URL = "sqlite:///./database.db"  # SQLite 資料庫檔案

# -------------------------------
# 設定資料庫
# -------------------------------
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# -------------------------------
# SQLAlchemy 資料表定義
# -------------------------------

# 打卡紀錄
class AttendanceDB(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String, index=True)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# 個人任務
class PersonalTaskDB(Base):
    __tablename__ = "personal_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String, index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    start_time = Column(DateTime, nullable=True)
    due_time = Column(DateTime, nullable=True)


# 團隊任務
class TeamTaskDB(Base):
    __tablename__ = "team_tasks"

    id = Column(Integer, primary_key=True, index=True)
    team = Column(String, index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    start_time = Column(DateTime, nullable=True)
    due_time = Column(DateTime, nullable=True)
    assigned_to = Column(Text, nullable=True)  # 存 JSON 字串


# 聊天室訊息
class MessageDB(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    team = Column(String)
    sender = Column(String)
    content = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# -------------------------------
# 建立資料表
# -------------------------------
def init_db():
    Base.metadata.create_all(bind=engine)


# -------------------------------
# FastAPI 依請求提供 DB session
# -------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
