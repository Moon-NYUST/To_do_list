from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone

# -------------------------------
# 打卡模型
# -------------------------------
class Attendance(BaseModel):
    user: str #使用者名稱
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))#打卡時間

# -------------------------------
# 個人任務模型
# -------------------------------
class PersonalTask(BaseModel):
    id: int #任務唯一識別碼
    user: str #所屬使用者
    title: str #任務標題
    description: Optional[str] = None #任務描述，可選填
    completed: bool = False #任務是否完成，預設未完成
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) #任務建立時間，預設現在時間

# -------------------------------
# 團隊任務模型
# -------------------------------
class TeamTask(BaseModel):
    id: int #任務唯一識別碼
    team: str #所屬團隊名稱
    title: str #任務標題
    description: Optional[str] = None #任務描述
    assigned_to: Optional[List[str]] = [] #分配給的成員清單
    completed: bool = False #任務是否完成
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) #任務建立時間

# -------------------------------
# 聊天室訊息模型
# -------------------------------
class Message(BaseModel):
    team: str #所屬團隊
    sender: str #發送者名稱
    content: str #訊息內容
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) #訊息時間
