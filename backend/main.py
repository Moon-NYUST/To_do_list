# main.py

from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 1. 確保匯入這兩個新模組
from routers import attendance, chat, auth, teams, stats
from routers.tasks import personal, team
from database import create_db_and_tables

load_dotenv()

app = FastAPI(title="多人 Todolist + 聊天室 + 打卡系統")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# 設定 CORS (保持您原本的設定)
origins = ["*"] # 開發環境建議先設為 *
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 註冊路由
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(chat.router)
app.include_router(personal.router) # /tasks/personal
app.include_router(team.router)     # /tasks/team

# === 新增以下兩行 ===
app.include_router(teams.router)    # /teams (解決新增團隊 404)
app.include_router(stats.router)    # /stats (解決儀表板數據)