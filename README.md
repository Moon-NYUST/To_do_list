# 網頁程式設計之期末專題
project/
│
├─ app/                      # FastAPI 主程式目录
│   ├─ main.py               # FastAPI 启动文件，汇总所有路由
│   ├─ routers/              # 各功能模块路由
│   │    ├─ attendance.py    # 打卡签到 API 路由
│   │    ├─ tasks.py         # Todolist API 路由（个人 & 团队）
│   │    └─ chat.py          # 团队聊天室 API 路由
│   ├─ models.py             # Pydantic 数据模型定义
│   └─ database.py           # 简易数据存储（列表或模拟数据库）
│
├─ requirements.txt          # Python 依赖清单
├─ .gitignore                # Git 忽略文件配置（如 __pycache__、.venv）
└─ README.md                 # 项目说明文件
