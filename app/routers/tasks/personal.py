from fastapi import APIRouter, HTTPException
from app.models import PersonalTask
from app.database import personal_tasks
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(
    prefix="/tasks/personal",
    tags=["Personal Tasks"]
)

# -------------------------------
# 新增個人任務
# URL: POST /tasks/personal/
# -------------------------------
@router.post("/")
def add_personal_task(task: PersonalTask):
    personal_tasks.append(task)
    return {"message": "個人任務已新增", "task": task}

# -------------------------------
# 查詢個人任務 (含篩選與排序)
# URL: GET /tasks/personal/{user}
# -------------------------------
@router.get("/{user}", response_model=List[PersonalTask])
def get_personal_tasks(
    user: str,
    sort_by: Optional[str] = None,
    order: str = "asc",
    due_before: Optional[datetime] = None
):
    # 1. 先篩選出該使用者的任務
    tasks = [t for t in personal_tasks if t.user == user]
    
    # 2. 篩選到期時間 (Filter by due date)
    if due_before:
        # 確保比較時時區一致，若無時區則視為 UTC (依據你的專案設定)
        tasks = [t for t in tasks if t.due_time and t.due_time <= due_before]
        
    # 3. 排序邏輯 (Sort)
    if sort_by:
        reverse = order.lower() == "desc"
        
        def get_sort_key(task):
            val = getattr(task, sort_by, None)
            if val is None:
                # 若無值：時間欄位視為最大(排最後)，字串視為空
                if sort_by in ['due_time', 'start_time', 'created_at']:
                    return datetime.max.replace(tzinfo=timezone.utc)
                return ""
            return val
            
        if sort_by in ['created_at', 'start_time', 'due_time', 'title', 'id']:
             tasks.sort(key=get_sort_key, reverse=reverse)
             
    return tasks

# -------------------------------
# 更新個人任務
# URL: PUT /tasks/personal/{id}
# -------------------------------
@router.put("/{id}")
def update_personal_task(id: int, updated_task: PersonalTask):
    for i, t in enumerate(personal_tasks):
        if t.id == id:
            personal_tasks[i] = updated_task
            return {"message": "個人任務已更新", "task": updated_task}
    raise HTTPException(status_code=404, detail="任務不存在")

# -------------------------------
# 刪除個人任務
# URL: DELETE /tasks/personal/{id}
# -------------------------------
@router.delete("/{id}")
def delete_personal_task(id: int):
    for t in personal_tasks:
        if t.id == id:
            personal_tasks.remove(t)
            return {"message": "個人任務已刪除"}
    raise HTTPException(status_code=404, detail="任務不存在")