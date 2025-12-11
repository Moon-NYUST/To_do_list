from pydantic import BaseModel, Field, computed_field
from typing import Optional, List
from datetime import datetime, timezone

# -------------------------------
# 打卡模型
# -------------------------------
class Attendance(BaseModel):
    user: str #使用者名稱
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))#打卡時間

# -------------------------------
# Base Task Model
# -------------------------------
class TaskBase(BaseModel):
    title: str #任務標題
    description: Optional[str] = None #任務描述，可選填
    completed: bool = False #任務是否完成，預設未完成
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) #任務建立時間，預設現在時間
    start_time: Optional[datetime] = None #任務開始時間
    due_time: Optional[datetime] = None #任務到期時間

    @computed_field
    @property
    def remaining_time(self) -> Optional[str]:
        if not self.due_time:
            return None
        
        now = datetime.now(timezone.utc)
        
        # 確保 due_time 有時區資訊
        target_time = self.due_time
        if target_time.tzinfo is None:
            target_time = target_time.replace(tzinfo=timezone.utc)

        delta = target_time - now
        
        if delta.total_seconds() < 0:
            return "已過期"
        
        days = delta.days
        hours, remainder = divmod(delta.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        
        if days > 0:
            return f"{days}天 {hours}小時 {minutes}分"
        else:
            return f"{hours}小時 {minutes}分"

# -------------------------------
# 個人任務模型
# -------------------------------
class PersonalTask(TaskBase):
    id: int #任務唯一識別碼
    user: str #所屬使用者

# -------------------------------
# 團隊任務模型
# -------------------------------
class TeamTask(TaskBase):
    id: int #任務唯一識別碼
    team: str #所屬團隊名稱
    assigned_to: Optional[List[str]] = [] #分配給的成員清單

# -------------------------------
# 聊天室訊息模型
# -------------------------------
class Message(BaseModel):
    team: str #所屬團隊
    sender: str #發送者名稱
    content: str #訊息內容
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) #訊息時間
