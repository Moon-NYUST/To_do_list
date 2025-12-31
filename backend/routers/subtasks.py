from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import SubTask, User, TeamTask, ActivityLog
from routers.auth import get_current_user
from typing import List, Optional
from pydantic import BaseModel
from routers.chat import manager

router = APIRouter(prefix="/subtasks", tags=["SubTasks"])

@router.post("/", response_model=SubTask)
def create_subtask(subtask: SubTask, session: Session = Depends(get_session)):
    """新增子任務"""
    session.add(subtask)
    session.commit()
    session.refresh(subtask)
    return subtask

@router.get("/{task_id}", response_model=List[SubTask])
def list_subtasks(task_id: str, session: Session = Depends(get_session)):
    """獲取某任務的所有子任務"""
    statement = select(SubTask).where(SubTask.task_id == task_id).order_by(SubTask.created_at)
    return session.exec(statement).all()

class SubTaskUpdate(BaseModel):
    is_completed: bool
    completed_by: Optional[str] = None

@router.patch("/{id}")
async def toggle_subtask(  # [修改] 改為 async
    id: str, 
    update_data: SubTaskUpdate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    subtask = session.get(SubTask, id)
    if not subtask:
        raise HTTPException(status_code=404, detail="SubTask not found")
    
    # Log Logic
    # 1. Check change
    if update_data.is_completed != subtask.is_completed:
        # 2. Get Parent Task (Check if TeamTask)
        parent_task = session.get(TeamTask, subtask.task_id)
        if parent_task:
            action = "checked" if update_data.is_completed else "unchecked"
            log = ActivityLog(
                team=parent_task.team,
                user_name=current_user.username,
                action=action,
                task_title=f"{parent_task.title} / {subtask.title}"
            )
            session.add(log)

    subtask.is_completed = update_data.is_completed
    subtask.completed_by = update_data.completed_by
    session.add(subtask)
    session.commit()
    session.refresh(subtask)
    # [新增] 廣播更新通知
    parent_task = session.get(TeamTask, subtask.task_id)
    if parent_task:
        # 發送 TASK_UPDATE 類型訊息，讓前端知道該重新抓取數據
        await manager.broadcast({
            "type": "TASK_UPDATE", 
            "team": parent_task.team,
            "task_id": parent_task.id # 可選：讓前端知道具體哪個任務變了
        }, parent_task.team)

    return subtask

@router.delete("/{id}")
def delete_subtask(id: str, session: Session = Depends(get_session)):
    """刪除子任務"""
    subtask = session.get(SubTask, id)
    if not subtask:
        raise HTTPException(status_code=404, detail="SubTask not found")
    session.delete(subtask)
    session.commit()
    return {"status": "success"}

@router.patch("/{id}/title")
def update_subtask_title(id: str, title: str, session: Session = Depends(get_session)):
    """更新子任務標題"""
    subtask = session.get(SubTask, id)
    if not subtask:
        raise HTTPException(status_code=404, detail="SubTask not found")
    subtask.title = title
    session.add(subtask)
    session.commit()
    session.refresh(subtask)
    return subtask
