from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlmodel import Session, select
from database import get_session
# [修正] 匯入 TaskUpdate
from models import PersonalTask, TaskCreate, TaskUpdate, PersonalTaskRead, User
from routers.auth import get_current_user

router = APIRouter(
    prefix="/tasks/personal",
    tags=["Personal Tasks"]
)

@router.get("/{user_name}", response_model=List[PersonalTaskRead])
def get_personal_tasks(
    user_name: str, 
    sort_by: str = "created_at", 
    order: str = "asc",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.username != user_name:
        raise HTTPException(status_code=403, detail="無法查看其他人的任務")

    statement = select(PersonalTask).where(PersonalTask.user_name == user_name)
    
    if sort_by == 'due_time':
        sort_col = PersonalTask.due_time
    elif sort_by == 'title':
        sort_col = PersonalTask.title
    else:
        sort_col = PersonalTask.created_at

    if order == 'desc':
        statement = statement.order_by(sort_col.desc())
    else:
        statement = statement.order_by(sort_col.asc())
        
    return session.exec(statement).all()

@router.post("/", response_model=PersonalTask)
def add_personal_task(
    task: TaskCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    new_task = PersonalTask(
        user_name=current_user.username,
        **task.dict()
    )
    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    return new_task

# [修正] 使用 TaskUpdate
@router.put("/{task_id}", response_model=PersonalTask)
def update_personal_task(
    task_id: str, 
    task_update: TaskUpdate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task = session.get(PersonalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.user_name != current_user.username:
        raise HTTPException(status_code=403, detail="權限不足")
        
    task_data = task_update.dict(exclude_unset=True)
    for key, value in task_data.items():
        setattr(task, key, value)
        
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_personal_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task = session.get(PersonalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.user_name != current_user.username:
        raise HTTPException(status_code=403, detail="權限不足")

    session.delete(task)
    session.commit()
    return {"message": "Deleted"}

@router.post("/{task_id}/promote")
def promote_to_team_task(
    task_id: str, 
    team_name: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from models import TeamTask
    
    task = session.get(PersonalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.user_name != current_user.username:
        raise HTTPException(status_code=403, detail="權限不足")
        
    new_team_task = TeamTask(
        team=team_name,
        title=task.title,
        description=task.description,
        is_completed=task.is_completed,
        created_at=task.created_at,
        due_time=task.due_time
    )
    
    new_team_task.assigned_to = [current_user.username]
    
    session.add(new_team_task)
    session.delete(task)
    session.commit()
    
    return {"message": "Task promoted to Team Task"}