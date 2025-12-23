from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select
from database import engine 
from models import Message, TeamTask, Team
import json

# 注意：這裡的 prefix 是 /ws
router = APIRouter(prefix="/ws", tags=["Chat"])

class ConnectionManager:
    def __init__(self):
        # 結構: {room_id: [websocket, ...]}
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, message: str, room_id: str):
        if room_id in self.active_connections:
            for connection in list(self.active_connections[room_id]):
                try:
                    await connection.send_text(message)
                except:
                    pass

manager = ConnectionManager()

# 獲取歷史訊息 (保持不變)
@router.get("/history/{room_id}")
def get_chat_history(room_id: str):
    with Session(engine) as session:
        statement = select(Message).where(Message.team == room_id).order_by(Message.timestamp.asc())
        return session.exec(statement).all()

# WebSocket 端點
@router.websocket("/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: str, 
    username: str = "Anonymous",
):
    # ---------------------------------------------------------
    # [權限檢查邏輯]
    # 這裡的 room_id 可能是 "團隊名稱" (大廳) 或 "任務ID" (私聊)
    # 我們需要判斷：如果是任務ID，檢查使用者是否在 assigned_to 裡面
    # ---------------------------------------------------------
    
    with Session(engine) as session:
        # 1. 先嘗試找找看是不是一個 TeamTask ID
        task = session.get(TeamTask, room_id)
        
        if task:
            # === 這是一個任務聊天室 ===
            if username not in task.assigned_to:
                # 權限不足，拒絕連線
                await websocket.close(code=1008, reason="Permission Denied")
                return
        else:
            # === 這可能是一個團隊大廳 (Team Name) ===
            # 檢查團隊是否存在以及用戶是否在團隊內
            team_stmt = select(Team).where(Team.name == room_id)
            team = session.exec(team_stmt).first()
            if team:
                if username not in team.members:
                    await websocket.close(code=1008, reason="Not a team member")
                    return
            # 如果都找不到，可能是無效的 ID，暫時允許或關閉視需求而定

    # 通過檢查，開始連線
    await manager.connect(websocket, room_id)
    try:
        # 廣播系統訊息 (可選)
        # await manager.broadcast(f"System: {username} 上線了", room_id)
        
        while True:
            data = await websocket.receive_text()
            
            # 儲存訊息
            with Session(engine) as session:
                new_msg = Message(
                    team=room_id, # 這裡 team 欄位借用來存 room_id (可能是團隊名或任務ID)
                    sender=username,
                    content=data
                )
                session.add(new_msg)
                session.commit()

            # 廣播
            await manager.broadcast(data, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)