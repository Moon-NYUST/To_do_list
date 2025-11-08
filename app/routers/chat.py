from fastapi import APIRouter, HTTPException
from app.models import Message
from app.database import messages
from typing import List

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

# -------------------------------
# 發送訊息
# -------------------------------
@router.post("/{team}")
def send_message(team: str, message: Message):
    if message.team != team:
        raise HTTPException(status_code=400, detail="訊息團隊名稱不一致")
    messages.append(message)
    return {"message": "訊息已發送", "data": message}

# -------------------------------
# 取得團隊訊息
# -------------------------------
@router.get("/{team}", response_model=List[Message])
def get_team_messages(team: str):
    return [m for m in messages if m.team == team]
