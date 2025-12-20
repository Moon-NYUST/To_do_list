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

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    pass

# -------------------------------
# 2. 考勤模型
# -------------------------------
class AttendanceBase(SQLModel):
    user_name: str
    clock_in: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    clock_out: Optional[datetime] = None

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
        return f"{hours}小時 {minutes}分"

class AttendanceRead(AttendanceBase):
    id: int
    work_hours: str

# -------------------------------
# 3. 任務模型
# -------------------------------
class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_time: Optional[datetime] = None

    # Removed property from Base to avoid shadowing warning in Read schemas

def calculate_remaining_time(due_time: Optional[datetime]) -> Optional[str]:
    if not due_time:
        return None
    now = datetime.now(timezone.utc)
    target_time = due_time
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
    return f"{hours}小時 {minutes}分"

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
        return self.assigned_to_str.split(",")

    @assigned_to.setter
    def assigned_to(self, value: List[str]):
        self.assigned_to_str = ",".join(value)

    @property
    def remaining_time(self) -> Optional[str]:
        return calculate_remaining_time(self.due_time)

class TaskCreate(TaskBase):
    pass

# Response Schemas (Explicitly include computed properties as fields)
class PersonalTaskRead(TaskBase):
    id: str
    user_name: str
    remaining_time: Optional[str]

class TeamTaskRead(TaskBase):
    id: str
    team: str
    assigned_to: List[str]
    remaining_time: Optional[str]

# -------------------------------
# 4. 聊天訊息
# -------------------------------
class MessageBase(SQLModel):
    team: str
    sender: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(MessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
