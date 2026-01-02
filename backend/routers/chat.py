from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, Depends
from sqlmodel import Session, select
from database import engine, get_session
from models import Message, MessageRead, User
from jose import jwt
import os
import json
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/ws", tags=["Chat"])

# --- 連線管理器 ---
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

    async def broadcast(self, message_dict: dict, room_id: str):
        # 將字典轉為 JSON 字串發送
        json_msg = json.dumps(message_dict, default=str)
        if room_id in self.active_connections:
            # 複製一份列表進行迭代，防止迭代時修改列表導致錯誤
            for connection in list(self.active_connections[room_id]):
                try:
                    await connection.send_text(json_msg)
                except Exception as e:
                    print(f"廣播失敗 (可能是客戶端已斷線): {e}")
                    # 可以在這裡做額外的清理，但通常 disconnect 會處理

manager = ConnectionManager()

def get_current_user_username(token: str):
    try:
        # 這裡簡化處理，實際應使用 auth.py 的邏輯，但為了避免循環引用
        # 假設 JWT_SECRET_KEY 一致
        SECRET_KEY = "YOUR_SUPER_SECRET_KEY"
        ALGORITHM = "HS256"
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except:
        return None

# --- 1. 歷史訊息 API (解決白屏的關鍵) ---
@router.get("/history/{room_id}", response_model=List[dict])
def get_history(
    room_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """
    獲取聊天室的歷史訊息 (支援分頁)
    """
    try:
        with Session(engine) as session:
            # 根據時間倒序撈取訊息 (最新的在前面)，以便分頁
            statement = select(Message).where(Message.team == room_id).order_by(Message.timestamp.desc()).offset(offset).limit(limit)
            results = session.exec(statement).all()
            
            # 轉換為前端需要的格式，並傳回正常的時間正序
            messages = []
            for msg in results:
                messages.append({
                    "id": msg.id,
                    "sender": msg.sender,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if msg.timestamp else ""
                })
            
            # 給前端時改回正序 (舊到新)
            messages.reverse()
            return messages
    except Exception as e:
        print(f"獲取歷史訊息失敗: {e}")
        return [] # 發生錯誤時回傳空陣列，保護前端不白屏

@router.post("/read/{team_name}")
async def mark_as_read(
    team_name: str,
    last_message_id: int,
    session: Session = Depends(get_session),
    username: str = Query(...)
):
    """更新使用者的已讀訊息 ID"""
    statement = select(MessageRead).where(
        MessageRead.username == username,
        MessageRead.team == team_name
    )
    read_record = session.exec(statement).first()
    
    if not read_record:
        read_record = MessageRead(
            username=username,
            team=team_name,
            last_read_message_id=last_message_id
        )
    else:
        read_record.last_read_message_id = max(read_record.last_read_message_id, last_message_id)
        read_record.updated_at = datetime.now(timezone.utc)
    
    session.add(read_record)
    session.commit()
    
    # 廣播已讀更新
    await manager.broadcast({
        "type": "READ_UPDATE",
        "username": username,
        "team": team_name,
        "last_read_message_id": read_record.last_read_message_id
    }, team_name)
    
    return {"status": "success"}

@router.get("/read-status/{team_name}")
def get_read_status(team_name: str, session: Session = Depends(get_session)):
    """獲取團隊所有成員的已讀狀態"""
    statement = select(MessageRead).where(MessageRead.team == team_name)
    results = session.exec(statement).all()
    
    # 同時獲取頭像資訊
    usernames = [r.username for r in results]
    user_stmt = select(User).where(User.username.in_(usernames))
    users = session.exec(user_stmt).all()
    avatar_map = {u.username: u.avatar for u in users}
    
    return [
        {
            "username": r.username,
            "last_read_message_id": r.last_read_message_id,
            "avatar": avatar_map.get(r.username)
        } for r in results
    ]

# --- 2. WebSocket 端點 ---
@router.websocket("/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: str, 
    username: str = Query(...)
):
    """
    處理即時聊天連線
    """
    await manager.connect(websocket, room_id)
    
    try:
        while True:
            # 1. 接收前端傳來的純文字消息
            data = await websocket.receive_text()
            
            # Special case: Notification channels are read-only for clients usually
            if room_id.startswith("notify:"):
                continue

            # 2. 存入資料庫
            timestamp = datetime.now(timezone.utc)
            saved_success = False
            
            try:
                with Session(engine) as session:
                    new_msg = Message(
                        team=room_id,   # 這裡同時儲存 Team Name 或 Task ID
                        sender=username,
                        content=data,
                        timestamp=timestamp
                    )
                    session.add(new_msg)
                    session.commit()
                    session.refresh(new_msg)
                    saved_success = True
            except Exception as e:
                print(f"訊息寫入資料庫失敗: {e}")
                # 就算寫入 DB 失敗，是否要廣播看你需求，這裡選擇不廣播以免造成資料不一致

            # 3. 只有寫入成功才廣播
            if saved_success:
                response_data = {
                    "sender": username,
                    "content": data,
                    "timestamp": timestamp.isoformat()
                }
                # 廣播給所有人 (前端收到後會更新 UI 或重新 fetch)
                await manager.broadcast(response_data, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
    except Exception as e:
        # 捕捉其他未預期的錯誤，避免整個 Server Crash
        print(f"WebSocket 發生錯誤: {e}")
        manager.disconnect(websocket, room_id)