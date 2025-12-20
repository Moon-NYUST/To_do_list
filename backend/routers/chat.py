from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlmodel import Session
from database import get_session
from models import Message
import json

router = APIRouter(prefix="/ws", tags=["Chat"])

class ConnectionManager:
    def __init__(self):
        # 存放結構: {team_name: [websocket_connection, ...]}
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, team: str):
        await websocket.accept()
        if team not in self.active_connections:
            self.active_connections[team] = []
        self.active_connections[team].append(websocket)

    def disconnect(self, websocket: WebSocket, team: str):
        if team in self.active_connections:
            if websocket in self.active_connections[team]:
                self.active_connections[team].remove(websocket)
            if not self.active_connections[team]:
                del self.active_connections[team]

    async def broadcast(self, message: str, team: str):
        if team in self.active_connections:
            # 複製一份列表進行迭代，避免在此處 modify dict
            for connection in list(self.active_connections[team]):
                try:
                    await connection.send_text(message)
                except:
                    pass

manager = ConnectionManager()

@router.websocket("/{task_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    task_id: str, 
    username: str = "Anonymous",
):
    # WebSocket 不易直接依賴 get_session, 這裡僅做即時通訊
    # 若要儲存歷史訊息，需手動建立 Session
    
    await manager.connect(websocket, task_id)
    try:
        # 廣播加入訊息
        await manager.broadcast(f"System:{username} 加入了聊天室", task_id)
        while True:
            data = await websocket.receive_text()
            # 這裡可以加入儲存訊息到 DB 的邏輯 (Optional)
            # with Session(engine) as session: ...
            await manager.broadcast(data, task_id) 
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
        await manager.broadcast(f"System:{username} 離開了聊天室", task_id)