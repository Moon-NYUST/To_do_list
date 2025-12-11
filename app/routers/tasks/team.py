from fastapi import APIRouter, HTTPException
from app.models import TeamTask
from app.database import team_tasks
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(
    prefix="/tasks/team",
    tags=["Team Tasks"]
)

# -------------------------------
# 新增團隊任務
# URL: POST /tasks/team/
# -------------------------------
@router.post("/")
def add_team_task(task: TeamTask):
    team_tasks.append(task)
    return {"message": "團隊任務已新增", "task": task}

# -------------------------------
# 查詢團隊任務 (含篩選與排序)
# URL: GET /tasks/team/{team}
# -------------------------------
@router.get("/{team}", response_model=List[TeamTask])
def get_team_tasks(
    team: str,
    sort_by: Optional[str] = None,
    order: str = "asc",
    due_before: Optional[datetime] = None
):
    # 1. 先篩選出該團隊的任務
    tasks = [t for t in team_tasks if t.team == team]
    
    # 2. 篩選到期時間
    if due_before:
        tasks = [t for t in tasks if t.due_time and t.due_time <= due_before]
        
    # 3. 排序邏輯
    if sort_by:
        reverse = order.lower() == "desc"
        
        def get_sort_key(task):
            val = getattr(task, sort_by, None)
            if val is None:
                if sort_by in ['due_time', 'start_time', 'created_at']:
                    return datetime.max.replace(tzinfo=timezone.utc)
                return ""
            return val
            
        if sort_by in ['created_at', 'start_time', 'due_time', 'title', 'id']:
             tasks.sort(key=get_sort_key, reverse=reverse)
             
    return tasks

# -------------------------------
# 更新團隊任務
# URL: PUT /tasks/team/{id}
# -------------------------------
@router.put("/{id}")
def update_team_task(id: int, updated_task: TeamTask):
    for i, t in enumerate(team_tasks):
        if t.id == id:
            team_tasks[i] = updated_task
            return {"message": "團隊任務已更新", "task": updated_task}
    raise HTTPException(status_code=404, detail="任務不存在")

# -------------------------------
# 刪除團隊任務
# URL: DELETE /tasks/team/{id}
# -------------------------------
@router.delete("/{id}")
def delete_team_task(id: int):
    for t in team_tasks:
        if t.id == id:
            team_tasks.remove(t)
            return {"message": "團隊任務已刪除"}
    raise HTTPException(status_code=404, detail="任務不存在")