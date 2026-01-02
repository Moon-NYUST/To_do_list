import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api, { remindersAPI, WS_BASE_URL, API_BASE_URL } from '../services/api';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // Import useTheme
import { useQueryClient } from '@tanstack/react-query'; // Import QueryClient
import { Toaster, toast } from 'react-hot-toast'; // Import Toast
import NotificationSettingsModal from './NotificationSettingsModal'; // Import Modal
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
  Users,
  Trash2,
  Moon,
  Sun,
  Palette
} from 'lucide-react';

interface Team {
  id: number;
  name: string;
  description?: string;
  members: string[];
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, avatar, updateAvatar, logout } = useAuth();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme(); // Use Theme
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient(); // Query Client for invalidation

  // 狀態管理
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false); // New theme modal
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

  // Notification State
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTime, setNotificationTime] = useState(localStorage.getItem('notificationTime') || '09:00');

  // Avatar State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const avatarOptions = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Patches',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Cuddles',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Tigger',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Cookie'
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAvatarUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const handleUpdateAvatar = async (url: string) => {
    try {
      await api.post('/update-avatar', { avatar: url });
      updateAvatar(url);
      setShowAvatarModal(false);
      toast.success("頭像已更新");
    } catch (err) {
      toast.error("更新頭像失敗");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.avatar) {
        updateAvatar(res.data.avatar);
        setShowAvatarModal(false);
        toast.success("頭像上傳成功");
      }
    } catch (err) {
      toast.error("頭像上傳失敗");
    }
  };

  // WebSocket Ref
  const notifyWs = useRef<WebSocket | null>(null);

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
  }, [user]);

  // --- WebSocket Global Listener ---
  useEffect(() => {
    if (!user) return;

    // Connect to notify:{user} channel
    const wsUrl = `${WS_BASE_URL}/notify:${user}?username=${user}`;
    notifyWs.current = new WebSocket(wsUrl);

    notifyWs.current.onopen = () => {
      console.log("Connected to Notification Channel");
    };

    notifyWs.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Notification received:", data);

        // Handle INVITE
        if (data.type === 'INVITE') {
          toast(data.message || "您有新的團隊邀請", { icon: '📩' });
          fetchTeams(); // Refresh sidebar
          // Also invalidate any team queries
          queryClient.invalidateQueries({ queryKey: ['teams'] });
        }
        // Handle TASK_UPDATE
        else if (data.type === 'TASK_UPDATE') {
          // Invalidate multiple queries for real-time refresh
          queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
          queryClient.invalidateQueries({ queryKey: ['personalTasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          queryClient.invalidateQueries({ queryKey: ['attendance'] }); // Also attendance just in case
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    return () => {
      if (notifyWs.current) notifyWs.current.close();
    };
  }, [user, queryClient]);


  // --- Scheduled Notification Logic ---
  useEffect(() => {
    // Check permissions
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkTime = async () => {
      const now = new Date();
      const currentString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      if (currentString === notificationTime) {
        // Fetch pending summary
        try {
          const res = await remindersAPI.getPendingSummary();
          const { personal, team, total } = res.data;

          if (total > 0) {
            new Notification("今日任務提醒 📅", {
              body: `您還有 ${total} 項待辦事項 (個人: ${personal}, 團隊: ${team})`,
              icon: '/vite.svg' // Optional icon
            });
            toast(`今日提醒: 您還有 ${total} 項待辦事項`, { icon: '⏰', duration: 5000 });
          }
        } catch (e) {
          console.error("Scheduled check failed", e);
        }
      }
    };

    // Check every 60 seconds
    // To prevent multi-trigger within the same minute, we can use a simple lock or just rely on '===' matching only once per minute roughly
    // Better: Store 'lastTriggeredDate' to avoid double firing
    const interval = setInterval(() => {
      const lastTrigger = localStorage.getItem('lastNotificationDate');
      const today = new Date().toDateString();

      // If already triggered today, check if time matches implies we might be in same minute.
      // Logic: We want to trigger ONCE per day when time matches.

      const now = new Date();
      const currentString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      if (currentString === notificationTime && lastTrigger !== today) {
        checkTime(); // Do the work
        localStorage.setItem('lastNotificationDate', today);
      }
    }, 30000); // Check every 30s to never miss a minute

    return () => clearInterval(interval);
  }, [notificationTime]);

  // Handle Save Notification Setting
  const handleSaveNotification = (time: string) => {
    setNotificationTime(time);
    localStorage.setItem('notificationTime', time);
    toast.success(`每日提醒時間已設定為 ${time}`);
  };


  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      await api.post('/teams/', { name: newTeamName });
      setShowCreateTeamModal(false);
      setNewTeamName('');
      fetchTeams(); // 重新整理列表
    } catch (err: any) {
      alert(err.response?.data?.detail || '建立失敗');
    } finally {
      setIsCreating(false);
    }
  };

  // 刪除團隊邏輯
  const handleDeleteTeam = async (e: React.MouseEvent, teamId: number, teamName: string) => {
    e.preventDefault();
    e.stopPropagation(); // 防止觸發 Link 跳轉

    if (!window.confirm(`確定要刪除團隊「${teamName}」嗎？此操作無法復原。`)) return;

    try {
      await api.delete(`/teams/${teamId}`);
      // 如果當前正在看這個團隊，導回首頁
      const currentTeamParam = new URLSearchParams(location.search).get('team');
      if (currentTeamParam === teamName) {
        navigate('/');
      }
      fetchTeams(); // 更新列表
    } catch (err) {
      alert('刪除失敗');
    }
  };

  return (
    <div className={`flex h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-200 text-slate-900'}`}>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 flex flex-col shadow-2xl z-40 transition-transform duration-300 lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-900 text-white'}
      `}>
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Layers size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight">TeamSync<span className="text-primary-400">.</span></h1>
          </div>

          <div className="space-y-1">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Workspace</p>
            <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${location.pathname === '/' && !location.search ? 'bg-primary-600 shadow-lg shadow-primary-900/50 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <LayoutDashboard size={20} className={location.pathname === '/' && !location.search ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
              <span className="font-bold text-sm">儀表板</span>
            </Link>
            <Link to="/tasks/personal" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${location.pathname === '/tasks/personal' ? 'bg-primary-600 shadow-lg shadow-primary-900/50 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <CheckSquare size={20} className={location.pathname === '/tasks/personal' ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
              <span className="font-bold text-sm">個人任務</span>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-3 px-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teams</p>
            <button onClick={() => setShowCreateTeamModal(true)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-1">
            {teams.map(team => {
              // 修正：同時檢查路徑是否包含 team 相關字眼
              const isActive = location.search === `?team=${encodeURIComponent(team.name)}`;
              return (
                <Link
                  key={team.id}
                  // [修正重點] 這裡的路徑改為 /tasks/team，這應該是您路由設定的正確路徑
                  to={`/tasks/team?team=${encodeURIComponent(team.name)}`}
                  className={`group relative flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-white/10 text-white border border-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-primary-400 shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]' : 'bg-slate-600'}`} />
                    <span className="font-bold text-sm truncate">{team.name}</span>
                  </div>

                  {/* 刪除按鈕 */}
                  <button
                    onClick={(e) => handleDeleteTeam(e, team.id, team.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-all"
                    title="刪除團隊"
                  >
                    <Trash2 size={14} />
                  </button>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <div
            onClick={() => setShowAvatarModal(true)}
            className="flex items-center gap-3 mb-4 px-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-800 shadow-inner group-hover:border-primary-500 transition-all">
              {avatar ? (
                <img src={getAvatarUrl(avatar) || ''} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">
                  {user ? user[0].toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate group-hover:text-primary-400 transition-colors">{user}</p>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 在線
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all text-sm font-bold"
          >
            <LogOut size={16} /> 登出
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative w-full">
        <header className={`h-20 backdrop-blur-md border-b flex items-center justify-between px-4 md:px-8 shrink-0 z-10 sticky top-0 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200/60'}`}>
          <div className="flex items-center gap-4">
            {/* Hamburger Menu */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`p-2 rounded-xl lg:hidden transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <Layers size={24} />
            </button>

            {/* Breadcrumbs / Title */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 overflow-hidden">
              <span className="hidden sm:inline">Workspace</span>
              <ChevronRight size={14} className="hidden sm:inline" />
              <span className={`font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                {location.pathname === '/' ? '儀表板' :
                  location.pathname.includes('personal') ? '個人任務' :
                    new URLSearchParams(location.search).get('team') || '團隊'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
              title={theme === 'light' ? '切換深色模式' : '切換淺色模式'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Primary Color Picker Button */}
            <button
              onClick={() => setShowThemeModal(true)}
              className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'text-primary-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
              title="更改主題顏色"
            >
              <Palette size={20} />
            </button>

            <button onClick={() => setShowNotificationModal(true)} className={`p-2 rounded-full transition-all relative ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`} title="設定每日提醒">
              <Bell size={20} />
            </button>
            <button className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-md rounded-3xl p-8 shadow-2xl transform transition-all scale-100 border`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-2xl">建立新團隊</h3>
              <button onClick={() => setShowCreateTeamModal(false)} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} text-slate-400`}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">團隊名稱</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="例如：產品設計部"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-primary-500 text-white' : 'bg-white border-slate-200 focus:border-primary-500 text-slate-800'}`}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(false)}
                    className={`flex-1 py-3.5 rounded-xl font-bold transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newTeamName}
                    className="flex-1 py-3.5 rounded-xl bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:shadow-primary-300 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {isCreating ? '建立中...' : '確認建立'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Theme Settings Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-sm rounded-3xl p-8 shadow-2xl transform transition-all scale-100 border`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-2xl">主題設定</h3>
              <button
                onClick={() => setShowThemeModal(false)}
                className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} text-slate-400`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">主色調</p>
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { id: 'indigo', color: '#6366f1' },
                    { id: 'rose', color: '#f43f5e' },
                    { id: 'blue', color: '#3b82f6' },
                    { id: 'emerald', color: '#10b981' },
                    { id: 'amber', color: '#f59e0b' }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setPrimaryColor(c.id)}
                      className={`w-10 h-10 rounded-full transition-all transform hover:scale-110 active:scale-90 flex items-center justify-center ${primaryColor === c.id ? `ring-4 ring-offset-2 ${theme === 'dark' ? 'ring-offset-slate-900' : 'ring-offset-white'} ring-primary-500` : ''}`}
                      style={{ backgroundColor: c.color }}
                    >
                      {primaryColor === c.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setShowThemeModal(false)}
                  className="w-full py-4 rounded-2xl bg-primary-600 text-white font-black shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showNotificationModal && (
        <NotificationSettingsModal
          onClose={() => setShowNotificationModal(false)}
          onSave={handleSaveNotification}
          currentTime={notificationTime}
        />
      )}

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className={`px-8 py-6 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>選擇個人頭像</h3>
              <button onClick={() => setShowAvatarModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {avatarOptions.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleUpdateAvatar(url)}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-110 active:scale-95 ${avatar === url ? 'border-primary-500 ring-4 ring-primary-500/20' : 'border-slate-100 dark:border-slate-800 hover:border-primary-300'}`}
                  >
                    <img src={url} alt={`avatar-${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 mb-3 rounded-2xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> 上傳自自定義圖片
              </button>

              <button
                onClick={() => setShowAvatarModal(false)}
                className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;