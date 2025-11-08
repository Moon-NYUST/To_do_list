from fastapi import FastAPI
from app.routers import attendance, tasks, chat

app = FastAPI(title="多人 Todolist + 聊天室 + 打卡系統")

app.include_router(attendance.router)
app.include_router(tasks.router)
app.include_router(chat.router)
