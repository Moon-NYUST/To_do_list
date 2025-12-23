from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlmodel import Session, select
from database import get_session
from models import Team, TeamCreate, TeamRead, User
from pydantic import BaseModel
from routers.auth import get_current_user

router = APIRouter(
    prefix="/teams",
    tags=["Teams Management"]
)

class AddMemberRequest(BaseModel):
    username: str

@router.get("/", response_model=List[TeamRead])
def get_my_teams(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 獲取所有團隊
    all_teams = session.exec(select(Team)).all()
    
    # 過濾出我是成員的團隊 (因 SQLite 存 CSV 字串，Python 過濾較簡單)
    my_teams = [
        team for team in all_teams 
        if current_user.username in team.members
    ]
    return my_teams

@router.post("/", response_model=TeamRead)
def create_team(
    team_data: TeamCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 檢查名稱是否重複
    statement = select(Team).where(Team.name == team_data.name)
    if session.exec(statement).first():
        raise HTTPException(status_code=400, detail="團隊名稱已存在")

    # 建立團隊 (將創建者自動加入成員)
    new_team = Team(
        name=team_data.name,
        description=team_data.description,
        created_by=current_user.username,
        members_str=current_user.username 
    )
    
    session.add(new_team)
    session.commit()
    session.refresh(new_team)
    return new_team

# [新增] 邀請成員加入團隊的 API
@router.post("/{team_name}/members")
def add_team_member(
    team_name: str,
    req: AddMemberRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. 找團隊
    statement = select(Team).where(Team.name == team_name)
    team = session.exec(statement).first()
    if not team:
        raise HTTPException(status_code=404, detail="團隊不存在")
    
    # 2. 權限檢查：只有團隊成員可以邀請別人 (或是限制只有創建者)
    if current_user.username not in team.members:
        raise HTTPException(status_code=403, detail="您不是該團隊成員，無法邀請")

    # 3. 檢查目標用戶是否存在
    user_stmt = select(User).where(User.username == req.username)
    target_user = session.exec(user_stmt).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="找不到該使用者")

    # 4. 檢查是否已經在團隊內
    current_members = team.members
    if req.username in current_members:
        return {"message": "該用戶已經在團隊中了"}

    # 5. 加入成員
    current_members.append(req.username)
    team.members = current_members # 觸發 setter 更新字串
    
    session.add(team)
    session.commit()
    
    return {"message": f"成功將 {req.username} 加入團隊"}

@router.get("/{team_name}", response_model=TeamRead)
def get_team_details(
    team_name: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """獲取特定團隊的詳細資訊（包含成員名單）"""
    statement = select(Team).where(Team.name == team_name)
    team = session.exec(statement).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="團隊不存在")
    
    # 確認當前用戶是否為該團隊成員 (隱私保護)
    if current_user.username not in team.members:
        raise HTTPException(status_code=403, detail="您不是該團隊成員")
        
    return team