from typing import List
from app.models import Attendance, PersonalTask, TeamTask, Message

# -------------------------------
# 打卡紀錄
# -------------------------------
attendances: List[Attendance] = []

# -------------------------------
# 個人任務列表
# -------------------------------
personal_tasks: List[PersonalTask] = []

# -------------------------------
# 團隊任務列表
# -------------------------------
team_tasks: List[TeamTask] = []

# -------------------------------
# 聊天室訊息列表
# -------------------------------
messages: List[Message] = []
