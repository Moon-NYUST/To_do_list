import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api'; // 確保您有這個 api service
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  Layers,
  Settings,
  Bell,
  Plus,
  X,
  Users
} from 'lucide-react';

// 定義團隊介面 (建議之後移到 types.ts)
interface Team {
  id: number;
  name: string;
  description?: string;
  members: string[];
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 狀態管理
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 1. 載入團隊列表
  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams/');
      setTeams(res.data);
    } catch (err) {
      console.error("無法載入團隊列表", err);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [user]); // 當使用者改變時重新載入

  // 2. 處理登出
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 3. 處理創建團隊
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      await api.post('/teams/', { 
        name: newTeamName,
        description: `由 ${user} 創建的團隊`
      });
      
      await fetchTeams(); // 重新整理列表
      setNewTeamName('');
      setShowCreateTeamModal(false);
      
      // 直接跳轉到新團隊
      navigate(`/teams?team=${encodeURIComponent(newTeamName)}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || '創建失敗，團隊名稱可能已存在');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 to-indigo-50/50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 sidebar-glass flex flex-col z-20 shadow-2xl relative">
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="text-white" size={22} />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">TeamSync</span>
          </div>

          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Workspace</p>
            <Link
              to="/"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                location.pathname === '/' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard size={20} />
              <span className="font-semibold text-sm">考勤儀表板</span>
            </Link>
            <Link
              to="/tasks"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                location.pathname === '/tasks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CheckSquare size={20} />
              <span className="font-semibold text-sm">個人任務</span>
            </Link>
          </nav>

          <div className="mt-10">
            <div className="flex items-center justify-between px-3 mb-3">
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Teams</p>
               <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{teams.length}</span>
            </div>
            
            <div className="space-y-1">
              {teams.map((team) => {
                const isActive = location.search.includes(`team=${encodeURIComponent(team.name)}`);
                return (
                  <Link
                    key={team.id}
                    to={`/teams?team=${encodeURIComponent(team.name)}`}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-white/10 text-white border border-white/10' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`}></div>
                      <span className="font-semibold text-sm truncate">{team.name}</span>
                    </div>
                    {isActive && <ChevronRight size={14} className="text-white/50" />}
                  </Link>
                );
              })}

              {/* 新增團隊按鈕 */}
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 border-dashed transition-all duration-200 group mt-2"
              >
                <div className="w-5 h-5 rounded-lg border border-slate-500 group-hover:border-white flex items-center justify-center">
                   <Plus size={12} />
                </div>
                <span className="font-semibold text-sm">建立新團隊</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-6 space-y-4 bg-slate-900/50 backdrop-blur-xl border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <UserIcon className="text-indigo-400" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user}</p>
              <p className="text-[10px] text-slate-500 font-medium">在線中</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-200 font-bold text-sm"
          >
            <LogOut size={18} />
            登出
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-20 flex items-center justify-between px-10 shrink-0 bg-white/50 backdrop-blur-sm border-b border-slate-200/50 z-10">
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            {location.pathname === '/' ? <><LayoutDashboard className="text-indigo-600"/> 考勤面板</> : 
             location.pathname === '/tasks' ? <><CheckSquare className="text-indigo-600"/> 個人任務管理</> : 
             <><Users className="text-indigo-600"/> 團隊協作空間</>}
          </h1>
          <div className="flex items-center gap-4">
            <button className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-200 rounded-xl transition-all hover:shadow-md">
              <Bell size={20} />
            </button>
            <button className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-200 rounded-xl transition-all hover:shadow-md">
              <Settings size={20} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-10 pb-10 pt-6 custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">建立新團隊</h3>
              <button onClick={() => setShowCreateTeamModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">團隊名稱</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="例如：產品設計部"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all font-medium"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(false)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newTeamName}
                    className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {isCreating ? '建立中...' : '確認建立'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;