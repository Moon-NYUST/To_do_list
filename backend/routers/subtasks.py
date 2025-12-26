from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import SubTask, User
from routers.auth import get_current_user
from typing import List

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

@router.patch("/{id}")
def toggle_subtask(id: str, is_completed: bool, session: Session = Depends(get_session)):
    """切換子任務完成狀態"""
    subtask = session.get(SubTask, id)
    if not subtask:
        raise HTTPException(status_code=404, detail="SubTask not found")
    subtask.is_completed = is_completed
    session.add(subtask)
    session.commit()
    session.refresh(subtask)
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
