# --- START OF FILE main.py ---
from fastapi import FastAPI
from app.routers import attendance, chat
# 從新的資料夾結構匯入
from app.routers.tasks import personal, team 

app = FastAPI(title="多人 Todolist + 聊天室 + 打卡系統")

# 註冊路由
app.include_router(attendance.router)
app.include_router(chat.router)
app.include_router(personal.router)
app.include_router(team.router)