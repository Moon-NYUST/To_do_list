from fastapi import APIRouter, HTTPException
from app.models import PersonalTask, TeamTask
from app.database import personal_tasks, team_tasks
from typing import List

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)

# -------------------------------
# 個人任務 CRUD
# -------------------------------
@router.post("/personal")
def add_personal_task(task: PersonalTask):
    personal_tasks.append(task)
    return {"message": "個人任務已新增", "task": task}

@router.get("/personal/{user}", response_model=List[PersonalTask])
def get_personal_tasks(user: str):
    return [t for t in personal_tasks if t.user == user]

@router.put("/personal/{id}")
def update_personal_task(id: int, updated_task: PersonalTask):
    for i, t in enumerate(personal_tasks):
        if t.id == id:
            personal_tasks[i] = updated_task
            return {"message": "個人任務已更新", "task": updated_task}
    raise HTTPException(status_code=404, detail="任務不存在")

@router.delete("/personal/{id}")
def delete_personal_task(id: int):
    for t in personal_tasks:
        if t.id == id:
            personal_tasks.remove(t)
            return {"message": "個人任務已刪除"}
    raise HTTPException(status_code=404, detail="任務不存在")

# -------------------------------
# 團隊任務 CRUD
# -------------------------------
@router.post("/team")
def add_team_task(task: TeamTask):
    team_tasks.append(task)
    return {"message": "團隊任務已新增", "task": task}

@router.get("/team/{team}", response_model=List[TeamTask])
def get_team_tasks(team: str):
    return [t for t in team_tasks if t.team == team]

@router.put("/team/{id}")
def update_team_task(id: int, updated_task: TeamTask):
    for i, t in enumerate(team_tasks):
        if t.id == id:
            team_tasks[i] = updated_task
            return {"message": "團隊任務已更新", "task": updated_task}
    raise HTTPException(status_code=404, detail="任務不存在")

@router.delete("/team/{id}")
def delete_team_task(id: int):
    for t in team_tasks:
        if t.id == id:
            team_tasks.remove(t)
            return {"message": "團隊任務已刪除"}
    raise HTTPException(status_code=404, detail="任務不存在")
