from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlmodel import Session, select
from database import get_session
from models import TeamTask, TaskCreate, TeamTaskRead, User
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
    # Filter: Only show tasks where current_user is in assigned_to
    # Note: SQLModel/SQLAlchemy filtering on JSON/String CSV is tricky in pure SQL for SQLite.
    # Since we store assigned_to as a CSV string mechanism in models.py logic, 
    # we might need to fetch and filter in python or use LIKE query.
    # Given the property `assigned_to` handles the split, let's filter in Python for simplicity 
    # (assuming volume is manageable for this MVP) or use a LIKE clause.
    
    # Using LIKE for basic filtering at DB level
    # assigned_to_str contains usernames like "alice,bob"
    # We want to find %current_user.username%
    
    statement = select(TeamTask).where(
        TeamTask.team == team_name,
        TeamTask.assigned_to_str.contains(current_user.username)
    )
    
    # Double check in python to avoid substring false positives (e.g. "bob" matches "bobby")
    tasks = session.exec(statement).all()
    filtered_tasks = [t for t in tasks if current_user.username in t.assigned_to]
    
    return filtered_tasks

@router.post("/", response_model=TeamTask)
def add_team_task(
    task_in: TaskCreate, 
    team_name: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    new_task = TeamTask(
        team=team_name,
        **task_in.dict()
    )
    
    # Auto-assign creator
    new_task.assigned_to = [current_user.username]
        
    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    return new_task

@router.put("/{task_id}", response_model=TeamTask)
def update_team_task(
    task_id: str, 
    task_in: dict, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task = session.get(TeamTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Visible check
    if current_user.username not in task.assigned_to:
         raise HTTPException(status_code=403, detail="Permission denied")

    # 手動更新欄位
    if "title" in task_in: task.title = task_in["title"]
    if "completed" in task_in: task.completed = task_in["completed"]
    if "assigned_to" in task_in: task.assigned_to = task_in["assigned_to"]
    
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
        
    # Visible check
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
    # Support query or body
    target_user = user_name
    if body:
        target_user = body.user_name

    if not target_user:
         raise HTTPException(status_code=400, detail="Missing user_name")

    task = session.get(TeamTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Visible check
    if current_user.username not in task.assigned_to:
         raise HTTPException(status_code=403, detail="Permission denied")
    
    current_members = task.assigned_to
    if target_user not in current_members:
        current_members.append(target_user)
        task.assigned_to = current_members # Trigger setter
        session.add(task)
        session.commit()
        
    return {"message": f"Assigned {target_user}"}