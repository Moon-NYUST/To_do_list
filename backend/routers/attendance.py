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
        return existing # 若已打卡直接回傳

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
