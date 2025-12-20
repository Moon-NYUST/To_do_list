# backend/main.py

from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from routers import attendance, chat, auth  # <--- 1. 加入 auth
from routers.tasks import personal, team

# ----------------------------------------------------
# 重點修改：配合新的資料夾結構匯入路由
# ----------------------------------------------------
from routers import attendance, chat
from routers.tasks import personal, team

from database import create_db_and_tables

load_dotenv()

app = FastAPI(title="多人 Todolist + 聊天室 + 打卡系統")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# 設定 CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# 註冊路由 (變數名稱不變，因為我們上方是用 from ... import 匯入)
# ----------------------------------------------------
app.include_router(auth.router)      # <--- 2. 新增這行，啟用認證路由
app.include_router(attendance.router)
app.include_router(chat.router)
app.include_router(personal.router)
app.include_router(team.router)

@app.get("/")
def root():
    return {"message": "後端伺服器運作中！"}