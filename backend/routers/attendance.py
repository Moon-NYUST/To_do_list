from fastapi import APIRouter, Depends
from typing import List
from sqlmodel import Session, select
from datetime import datetime, timezone
from database import get_session
from database import get_session
from models import Attendance, AttendanceBase, AttendanceRead
from pydantic import BaseModel

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)

class StatusRequest(BaseModel):
    usernames: List[str]

@router.post("/status")
def get_online_status(
    req: StatusRequest,
    session: Session = Depends(get_session)
):
    online_members = []
    for username in req.usernames:
        # 找最後一筆紀錄
        stmt = select(Attendance).where(Attendance.user_name == username).order_by(Attendance.clock_in.desc())
        last_rec = session.exec(stmt).first()
        if last_rec and not last_rec.clock_out:
            online_members.append(username)
    return online_members

class ClockInRequest(BaseModel):
    user: str

@router.post("/", response_model=Attendance)
def clock_in(req: ClockInRequest, session: Session = Depends(get_session)):
    # 檢查是否已打卡但未簽退
    statement = select(Attendance).where(
        Attendance.user_name == req.user, 
        Attendance.clock_out == None
    )
    existing = session.exec(statement).first()
    
    if existing:
        # Lazy Check: 如果是不同天的打卡紀錄，自動幫他簽退
        now = datetime.now(timezone.utc)
        if existing.clock_in.date() < now.date():
            # 自動補簽退 (設定為當天 23:59:59 或 根據需求處理)
            # 這裡簡單處理：直接簽退在現在
            existing.clock_out = now
            session.add(existing)
            session.commit()
            # 繼續往下執行，建立新的打卡紀錄
        else:
            return existing # 同一天的重複打卡，直接回傳

    new_record = Attendance(user_name=req.user)
    session.add(new_record)
    session.commit()
    session.refresh(new_record)
    return new_record

@router.post("/clock-out")
def clock_out(user: str, session: Session = Depends(get_session)):
    statement = select(Attendance).where(
        Attendance.user_name == user,
        Attendance.clock_out == None
    )
    record = session.exec(statement).first()
    if record:
        record.clock_out = datetime.now(timezone.utc)
        session.add(record)
        session.commit()
        return {"message": "已簽退", "work_hours": record.work_hours}
    return {"message": "找不到進行中的打卡紀錄"}

@router.get("/{user}", response_model=List[AttendanceRead])
def get_history(user: str, session: Session = Depends(get_session)):
    statement = select(Attendance).where(Attendance.user_name == user).order_by(Attendance.clock_in.desc())
    return session.exec(statement).all()

@router.get("/status/online")
def get_online_users(session: Session = Depends(get_session)):
    # 查詢所有沒有 clock_out 的紀錄
    statement = select(Attendance.user_name).where(Attendance.clock_out == None).distinct()
    online = session.exec(statement).all()
    return {"online_users": online}
