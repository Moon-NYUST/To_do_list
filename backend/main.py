from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import os

# 1. 汇入所有路由模组
from routers import attendance, chat, auth, teams, stats, subtasks
from routers.tasks import personal, team
from database import create_db_and_tables

load_dotenv()

app = FastAPI(title="TeamSync Pro - 全端协作系统")

# 2. 资料库与资料夹初始化
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # 确保上传资料夹存在
    os.makedirs("uploads/avatars", exist_ok=True)

# 3. 设定 CORS
origins = [
    "http://localhost:3000",
    "https://to-do-list-7cva.onrender.com",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 注册所有 API 路由
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(chat.router)
app.include_router(personal.router) # /tasks/personal
app.include_router(team.router)     # /tasks/team
app.include_router(teams.router)    # /teams (团队管理)
app.include_router(stats.router)    # /stats (儀表板統計)
app.include_router(subtasks.router) # /subtasks (子任務)

# ==========================================
# 5. 使用者上傳檔案掛載 (頭像等)
# ==========================================
if not os.path.exists("uploads"):
    os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ==========================================
# 6. 前端靜態檔案托管 (僅當合併部署時使用)
# ==========================================
frontend_dist_path = os.getenv("FRONTEND_DIST_PATH", "./static")

if os.path.exists(frontend_dist_path):
    # A. 挂载静态资源 (JS, CSS, 图片等)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")
    
    # B. 捕捉所有未知的路由 (SPA 路由支援)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith(("api", "ws", "docs", "openapi.json")):
            return {"error": "Not Found", "detail": "API path not found"}
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
else:
    print(f"提示：未偵測到前端靜態檔案路徑: {frontend_dist_path}。後端將僅作為 API 服務。")