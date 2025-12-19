# --- START OF FILE main.py ---
from fastapi import FastAPI
from app.routers import attendance, chat
# 從新的資料夾結構匯入
from app.routers.tasks import personal, team 
from app.database import init_db

# @asynccontextmanager
async def lifespan(app: FastAPI):
    # 【啟動時】執行：建立資料表
    init_db()
    yield
    # 【關閉時】執行：可以在這裡寫清理邏輯（如果有需要）


app = FastAPI(title="多人 Todolist + 聊天室 + 打卡系統",lifespan=lifespan)

# 註冊路由
app.include_router(attendance.router)
app.include_router(chat.router)
app.include_router(personal.router)
app.include_router(team.router)

