from fastapi import APIRouter, Depends
from typing import List, Optional
from sqlmodel import Session, select
from datetime import datetime, timezone
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
    planned_hours: float
    task_ids: Optional[str] = None
    initial_task_titles: Optional[str] = None

@router.post("/", response_model=Attendance)
def clock_in(req: ClockInRequest, session: Session = Depends(get_session)):
    # 檢查是否已打卡但未簽退
    statement = select(Attendance).where(
        Attendance.user_name == req.user, 
        Attendance.status != "completed"
    )
    existing = session.exec(statement).first()
    
    if existing:
        # 如果有正在進行中的紀錄，直接返回原有紀錄或根據邏輯處理
        # 這裡我們允許返回，以便前端持久化
        return existing

    new_record = Attendance(
        user_name=req.user,
        planned_hours=req.planned_hours,
        task_ids=req.task_ids,
        initial_task_titles=req.initial_task_titles,
        status="working"
    )
    session.add(new_record)
    session.commit()
    session.refresh(new_record)
    return new_record

class ClockOutRequest(BaseModel):
    user: str
    report_summary: Optional[str] = None
    completed_tasks: Optional[str] = None

@router.post("/clock-out")
def clock_out(req: ClockOutRequest, session: Session = Depends(get_session)):
    statement = select(Attendance).where(
        Attendance.user_name == req.user,
        Attendance.status != "completed"
    ).order_by(Attendance.clock_in.desc()) # Get the latest active one
    
    record = session.exec(statement).first()
    if record:
        now = datetime.now(timezone.utc)
        record.clock_out = now
        record.status = "completed"
        record.report_summary = req.report_summary
        record.completed_tasks = req.completed_tasks
        session.add(record)
        session.commit()
        session.refresh(record)
        return {"message": "已簽退", "work_hours": record.work_hours, "record": record}
    return {"message": "找不到進行中的打卡紀錄"}

@router.get("/active/{user}", response_model=Optional[Attendance])
def get_active_session(user: str, session: Session = Depends(get_session)):
    statement = select(Attendance).where(
        Attendance.user_name == user,
        Attendance.status != "completed"
    ).order_by(Attendance.clock_in.desc())
    return session.exec(statement).first()

@router.get("/heatmap/{user}")
def get_heatmap_data(user: str, session: Session = Depends(get_session)):
    # 獲取該用戶所有已完成的打卡紀錄，並按天加總時數
    # 由於 SQLModel/SQLite 對日期的處理稍微複雜，這裡我們在 Python 層做簡單處理
    statement = select(Attendance).where(
        Attendance.user_name == user,
        Attendance.status == "completed"
    )
    records = session.exec(statement).all()
    
    heatmap = {}
    for r in records:
        if r.clock_in and r.clock_out:
            date_str = r.clock_in.date().isoformat()
            duration = (r.clock_out - r.clock_in).total_seconds() / 3600.0
            heatmap[date_str] = heatmap.get(date_str, 0) + duration
            
    return heatmap

@router.get("/team/{team_name}")
def get_team_reports(team_name: str, session: Session = Depends(get_session)):
    # 這裡的邏輯：找出該團隊的所有成員，並回傳他們最近的打卡紀錄（帶報告的）
    from models import Team
    team = session.exec(select(Team).where(Team.name == team_name)).first()
    if not team:
        return []
    
    members = team.members
    statement = select(Attendance).where(
        Attendance.user_name.in_(members),
        Attendance.status == "completed"
    ).order_by(Attendance.clock_out.desc()).limit(20)
    
    return session.exec(statement).all()

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
