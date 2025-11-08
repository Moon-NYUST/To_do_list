from fastapi import APIRouter, HTTPException
from app.models import Attendance
from app.database import attendances
from datetime import datetime

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)

# -------------------------------
# 打卡
# -------------------------------
@router.post("/")
def clock_in(attendance: Attendance):
    attendances.append(attendance)
    return {"message": f"{attendance.user} 已打卡", "attendance": attendance}

# -------------------------------
# 查詢個人打卡紀錄
# -------------------------------
@router.get("/{user}")
def get_attendance(user: str):
    user_attendance = [a for a in attendances if a.user == user]
    if not user_attendance:
        raise HTTPException(status_code=404, detail="找不到打卡紀錄")
    return user_attendance
