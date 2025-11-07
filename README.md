# 網頁程式設計之期末專題

# 多人 Todolist + 聊天室 + 打卡签到系统

## 项目简介
这是一个使用 **FastAPI** 开发的后端系统，包含以下功能：
- 📅 打卡签到
- 🗒️ 个人 & 团队 Todolist
- 💬 团队聊天室（仅团队成员可用）

API 可通过 **Postman** 或 **Swagger UI** 测试，无需前端界面。

---

## 📁 專案結構
```text
project/
├── app/
│   ├── main.py
│   ├── routers/
│   │   ├── attendance.py
│   │   ├── tasks.py
│   │   └── chat.py
│   ├── models.py
│   └── database.py
│
├── requirements.txt
├── .gitignore
└── README.md
---

## 功能说明

### 1️⃣ 打卡签到
- **POST /attendance**：用户签到  
- **GET /attendance/{user}**：查询个人签到记录  

### 2️⃣ 个人 Todolist
- **POST /tasks/personal**：新增个人任务  
- **GET /tasks/personal/{user}**：查看个人任务列表  
- **PUT /tasks/personal/{id}**：更新个人任务  
- **DELETE /tasks/personal/{id}**：删除个人任务  

### 3️⃣ 团队 Todolist
- **POST /tasks/team**：新增团队任务  
- **GET /tasks/team/{team}**：查看团队任务列表  
- **PUT /tasks/team/{id}**：更新团队任务  
- **DELETE /tasks/team/{id}**：删除团队任务  

### 4️⃣ 团队聊天室
- **POST /chat/{team}**：发送团队消息  
- **GET /chat/{team}**：获取团队消息  

---

## 快速启动指南

1. 建立虚拟环境
```powershell
python -m venv .venv
