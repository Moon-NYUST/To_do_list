from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import PersonalTask, TeamTask, User
from routers.auth import get_current_user
from datetime import datetime, timezone

router = APIRouter(
    prefix="/stats",
    tags=["Statistics"]
)

@router.get("/dashboard")
def get_dashboard_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. 待處理個人任務 (Personal Tasks) - 未完成的
    stmt_personal = select(PersonalTask).where(
        PersonalTask.user_name == current_user.username,
        PersonalTask.is_completed == False
    )
    personal_count = len(session.exec(stmt_personal).all())

    # 2. 逾期事項 (Overdue) - 個人 + 團隊 (未完成且時間已過)
    now = datetime.now(timezone.utc)
    
    # 逾期個人任務
    stmt_overdue_p = select(PersonalTask).where(
        PersonalTask.user_name == current_user.username,
        PersonalTask.is_completed == False,
        PersonalTask.due_time < now
    )
    overdue_p_count = len(session.exec(stmt_overdue_p).all())

    # 逾期團隊任務 (指派給我的)
    # 因為 SQLite 存字串，我們撈出所有該團隊逾期任務，再用 Python 過濾
    stmt_overdue_t = select(TeamTask).where(
        TeamTask.is_completed == False,
        TeamTask.due_time < now
    )
    all_overdue_t = session.exec(stmt_overdue_t).all()
    
    # 過濾出 assigned_to 包含我的
    overdue_t_count = sum(1 for t in all_overdue_t if current_user.username in t.assigned_to)

    return {
        "pending_personal_tasks": personal_count,
        "total_overdue": overdue_p_count + overdue_t_count
    }