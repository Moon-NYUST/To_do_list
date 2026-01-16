from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
from sqlmodel import SQLModel, Field

# -------------------------------
# 1. 基礎 User 模型
# -------------------------------
class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    avatar: Optional[str] = Field(default="https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky")

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    avatar: Optional[str] = None

# -------------------------------
# 2. 考勤 模型
# -------------------------------
class AttendanceBase(SQLModel):
    user_name: str
    clock_in: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    clock_out: Optional[datetime] = None
    planned_hours: float = Field(default=0.0)
    task_ids: Optional[str] = Field(default=None) # Comma-separated Task IDs
    initial_task_titles: Optional[str] = Field(default=None) # Comma-separated Task Titles
    status: str = Field(default="working") # working, reviewing, completed
    report_summary: Optional[str] = Field(default=None)
    completed_tasks: Optional[str] = Field(default=None) # Metadata or specific summary

class Attendance(AttendanceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    @property
    def work_hours(self) -> str:
        if not self.clock_out:
            return "進行中"
        delta = self.clock_out - self.clock_in
        total_seconds = int(delta.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        return f"{hours}h {minutes}m"

class AttendanceRead(AttendanceBase):
    id: int
    work_hours: str

# -------------------------------
# 3. 團隊 (Team) 模型
# -------------------------------
class TeamBase(SQLModel):
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None

class Team(TeamBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_by: str
    members_str: str = Field(default="")

    @property
    def members(self) -> List[str]:
        if not self.members_str:
            return []
        return self.members_str.split(",")
    
    @members.setter
    def members(self, value: List[str]):
        self.members_str = ",".join(value)

class TeamCreate(TeamBase):
    pass

class TeamRead(TeamBase):
    id: int
    created_by: str
    members: List[str]
    member_details: Optional[List[UserResponse]] = None

# -------------------------------
# 4. 任務 (Task) 模型
# -------------------------------
class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    due_time: Optional[datetime] = None
    is_completed: bool = Field(default=False)
    status: str = Field(default="todo") # New status field
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_by: Optional[str] = None # User who completed the task

# 用於「創建」
class TaskCreate(TaskBase):
    pass

# 用於「個人任務更新」
class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_time: Optional[datetime] = None
    is_completed: Optional[bool] = None
    status: Optional[str] = None
    completed_by: Optional[str] = None

# [新增] 用於「團隊任務更新」 (包含 assigned_to)
class TeamTaskUpdate(TaskUpdate):
    assigned_to: Optional[List[str]] = None

# 用於「團隊任務創建」
class TeamTaskCreate(TaskBase):
    team: str
    assigned_to: List[str] = []

class PersonalTask(TaskBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_name: str
    
    @property
    def remaining_time(self) -> Optional[str]:
        return calculate_remaining_time(self.due_time)

class TeamTask(TaskBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    team: str
    assigned_to_str: str = Field(default="", description="Comma separated usernames") 

    @property
    def assigned_to(self) -> List[str]:
        if not self.assigned_to_str:
            return []
        # [修復] 使用 strip() 去除逗號前後可能存在的空格，並過濾掉空字串
        return [s.strip() for s in self.assigned_to_str.split(",") if s.strip()]

    @assigned_to.setter
    def assigned_to(self, value: List[str]):
        # [優化] 存入時也確保格式統一
        self.assigned_to_str = ",".join([str(v).strip() for v in value if v])

    @property
    def remaining_time(self) -> Optional[str]:
        return calculate_remaining_time(self.due_time)

# Response Schemas
class PersonalTaskRead(TaskBase):
    id: str
    user_name: str
    remaining_time: Optional[str]
    completed_by: Optional[str] = None

class TeamTaskRead(TaskBase):
    id: str
    team: str
    assigned_to: List[str] = []
    remaining_time: Optional[str] = None
    completed_by: Optional[str] = None

# [新增] 子任務模型
class SubTask(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    task_id: str = Field(index=True) # 對應 PersonalTask 或 TeamTask 的 ID
    title: str
    is_completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_by: Optional[str] = None

class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team: str = Field(index=True)
    sender: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageRead(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True)
    team: str = Field(index=True)
    last_read_message_id: int
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper
def calculate_remaining_time(due_time: Optional[datetime]) -> Optional[str]:
    if not due_time:
        return None
    now = datetime.now(timezone.utc)
    if due_time.tzinfo is None:
        due_time = due_time.replace(tzinfo=timezone.utc)
    if due_time < now:
        return "Overdue"
    delta = due_time - now
    days = delta.days
    hours, _ = divmod(delta.seconds, 3600)
# -------------------------------
# 5. Activity Log (新增)
# -------------------------------
class ActivityLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team: str = Field(index=True)
    user_name: str
    action: str # 'checked' | 'unchecked'
    task_title: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityLogRead(SQLModel):
    id: int
    user_name: str
    action: str
    task_title: str
    timestamp: datetime