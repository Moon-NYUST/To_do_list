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

# 3. 设定 CORS (允许所有来源，方便开发与 ngrok)
origins = [
    "http://localhost:3000",
    "https://to-do-list-7cva.onrender.com", # 👈 填入你的 Render 前端網址
    "*", # 暫時保留 * 以利除錯
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
# 5. 前端静态档案托管 (关键部分)
# ==========================================

# 设定前端打包档案的路径 (使用环境变量或预设值)
frontend_dist_path = os.getenv("FRONTEND_DIST_PATH", "./static")

# 检查路径是否存在
if os.path.exists(frontend_dist_path):
    # A. 挂载静态资源 (JS, CSS, 图片等)
    # 当浏览器请求 /assets/xxx.js 时，去 dist/assets 找
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")
    
    # B. 挂载使用者上傳的資料夾
    # 確保 uploads 目錄存在才能掛載
    if not os.path.exists("uploads"):
        os.makedirs("uploads/avatars", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    # B. 捕捉所有未知的路由 (SPA 路由支援)
    # 这样当使用者重整页面，或直接访问 /login, /tasks 时，都能正确回传 React 页面
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # 如果请求是以 /api, /ws, /docs, /openapi.json 开头，不拦截
        # 让它们去执行上面的 API 逻辑
        if full_path.startswith(("api", "ws", "docs", "openapi.json")):
            return {"error": "Not Found", "detail": "API path not found"}
        
        # 其他所有请求都回传 index.html
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
else:
    print(f"警告：找不到前端路径: {frontend_dist_path}")
    print("如果您只是开发后端 API，可忽略此讯息。若要分享网页，请确认 npm run build 已执行。")