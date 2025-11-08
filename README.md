# 網頁程式設計期末專題

## 專題名稱
**多人 Todolist + 聊天室 + 打卡签到系統**

---

## 專案簡介
本專案使用 **FastAPI** 開發後端系統，主要功能包括：
- 📅 打卡签到
- 🗒️ 個人 & 團隊 Todolist
- 💬 團隊聊天室（僅團隊成員可使用）

API 可透過 **Postman** 或 **Swagger UI** 測試，無需前端介面。

---

## 專案結構

```text
project/
├── app/                   # FastAPI 主程式目錄
│   ├── main.py            # FastAPI 啟動檔，匯總所有路由
│   ├── routers/           # 各功能模組路由
│   │   ├── attendance.py  # 打卡签到路由
│   │   ├── tasks.py       # Todolist 路由（個人 & 團隊）
│   │   └── chat.py        # 團隊聊天室路由
│   ├── models.py          # Pydantic 資料模型定義
│   └── database.py        # 簡易資料存儲（列表或模擬資料庫）
│
├── requirements.txt       # Python 套件依賴清單
├── .gitignore             # Git 忽略檔案設定
└── README.md              # 專案說明檔
