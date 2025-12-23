from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlmodel import Session, select
from database import get_session
# [修正] 匯入 TeamTaskUpdate
from models import TeamTask, TeamTaskCreate, TeamTaskRead, User, TeamTaskUpdate
from pydantic import BaseModel
from routers.auth import get_current_user

router = APIRouter(
    prefix="/tasks/team",
    tags=["Team Tasks"]
)

class AssignRequest(BaseModel):
    user_name: str

@router.get("/{team_name}", response_model=List[TeamTaskRead])
def get_team_tasks(
    team_name: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(TeamTask).where(TeamTask.team == team_name)
    tasks = session.exec(statement).all()
    return tasks

@router.post("/", response_model=TeamTask)
def add_team_task(
    task_in: TeamTaskCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    new_task = TeamTask(
        team=task_in.team,
        title=task_in.title,
        description=task_in.description,
        due_time=task_in.due_time,
        is_completed=task_in.is_completed,
        created_at=task_in.created_at
    )
    
    if task_in.assigned_to:
        new_task.assigned_to = task_in.assigned_to
    else:
        new_task.assigned_to = [current_user.username]
        
    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    return new_task

# [修正] 使用 TeamTaskUpdate (包含 assigned_to)
@router.put("/{task_id}", response_model=TeamTask)
def update_team_task(
    task_id: str, 
    task_in: TeamTaskUpdate, # <--- 改成 TeamTaskUpdate
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task = session.get(TeamTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.username not in task.assigned_to:
         raise HTTPException(status_code=403, detail="Permission denied")

    # 部分更新
    task_data = task_in.dict(exclude_unset=True)
    for key, value in task_data.items():
        setattr(task, key, value) # 這裡會自動觸發 assigned_to 的 setter
    
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_team_task(
    task_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task = session.get(TeamTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if current_user.username not in task.assigned_to:
         raise HTTPException(status_code=403, detail="Permission denied")
         
    session.delete(task)
    session.commit()
    return {"message": "Deleted"}

@router.post("/{task_id}/assign")
def assign_member(
    task_id: str, 
    user_name: str = None, 
    body: AssignRequest = None, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    target_user = user_name
    if body:
        target_user = body.user_name

    if not target_user:
         raise HTTPException(status_code=400, detail="Missing user_name")

    task = session.get(TeamTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.username not in task.assigned_to:
         raise HTTPException(status_code=403, detail="Permission denied")
    
    current_members = task.assigned_to
    if target_user not in current_members:
        current_members.append(target_user)
        task.assigned_to = current_members 
        session.add(task)
        session.commit()
        
    return {"message": f"Assigned {target_user}"}