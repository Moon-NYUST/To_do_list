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
    # 1. 待處理任務 (Pending Tasks) - 個人 + 指派給我的團隊任務
    stmt_personal = select(PersonalTask).where(
        PersonalTask.user_name == current_user.username,
        PersonalTask.is_completed == False
    )
    personal_pending_count = len(session.exec(stmt_personal).all())

    # 獲取所有未完成團隊任務
    stmt_team = select(TeamTask).where(
        TeamTask.is_completed == False
    )
    all_pending_team = session.exec(stmt_team).all()
    team_pending_count = sum(1 for t in all_pending_team if current_user.username in t.assigned_to)

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
    stmt_overdue_t = select(TeamTask).where(
        TeamTask.is_completed == False,
        TeamTask.due_time < now
    )
    all_overdue_t = session.exec(stmt_overdue_t).all()
    overdue_t_count = sum(1 for t in all_overdue_t if current_user.username in t.assigned_to)

    return {
        "pending_tasks_count": personal_pending_count + team_pending_count,
        "overdue_tasks_count": overdue_p_count + overdue_t_count
    }

@router.get("/tasks/pending")
def get_pending_tasks_details(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 個人 + 團隊指派
    personal = session.exec(select(PersonalTask).where(
        PersonalTask.user_name == current_user.username,
        PersonalTask.is_completed == False
    )).all()
    
    # 全部未完成團隊任務
    team = session.exec(select(TeamTask).where(TeamTask.is_completed == False)).all()
    team_assigned = [t for t in team if current_user.username in t.assigned_to]
    
    return {
        "personal": personal,
        "team": team_assigned
    }

@router.get("/tasks/overdue")
def get_overdue_tasks_details(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    personal = session.exec(select(PersonalTask).where(
        PersonalTask.user_name == current_user.username,
        PersonalTask.is_completed == False,
        PersonalTask.due_time < now
    )).all()
    
    team = session.exec(select(TeamTask).where(
        TeamTask.is_completed == False,
        TeamTask.due_time < now
    )).all()
    team_assigned = [t for t in team if current_user.username in t.assigned_to]
    
    return {
        "personal": personal,
        "team": team_assigned
    }

@router.get("/team/{team_name}")
def get_team_stats_and_logs(
    team_name: str,
    limit: int = 10,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from models import ActivityLog, ActivityLogRead, TeamTask, SubTask
    
    # 1. Fetch Logs
    logs = session.exec(
        select(ActivityLog)
        .where(ActivityLog.team == team_name)
        .order_by(ActivityLog.timestamp.desc())
        .limit(limit)
    ).all()

    # 2. Calculate Contributions
    # - Main Tasks
    team_tasks = session.exec(select(TeamTask).where(TeamTask.team == team_name)).all()
    
    contributions = {} 
    
    # Init members
    # Assuming we can get members from a Team object, but here we can just collect unique assignees + completed_by
    # Or just iterate tasks. 
    
    for task in team_tasks:
        if task.completed_by:
            if task.completed_by not in contributions:
                contributions[task.completed_by] = {"main": 0, "sub": 0}
            contributions[task.completed_by]["main"] += 1
            
        # - Subtasks (need to fetch all related subtasks)
        subtasks = session.exec(select(SubTask).where(SubTask.task_id == task.id)).all()
        for st in subtasks:
            if st.is_completed and st.completed_by:
                if st.completed_by not in contributions:
                    contributions[st.completed_by] = {"main": 0, "sub": 0}
                contributions[st.completed_by]["sub"] += 1

    # Format contributions list
    contribution_list = [
        {"username": k, "main": v["main"], "sub": v["sub"], "total": v["main"] * 2 + v["sub"]} 
        for k, v in contributions.items()
    ]
    contribution_list.sort(key=lambda x: x["total"], reverse=True)

    return {
        "logs": logs,
        "contributions": contribution_list
    }