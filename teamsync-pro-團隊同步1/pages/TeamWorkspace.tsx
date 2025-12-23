import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Circle,
  X,
  Plus,
  Calendar,
  Users,
  MoreVertical,
  Trash2,
  Edit2,
  Layout,
  UserPlus,
  Lock
} from 'lucide-react';

interface TeamTask {
  id: string;
  title: string;
  description?: string;
  due_time?: string;
  is_completed: boolean; 
  team: string;
  assigned_to: string[];
  created_at: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

const TeamWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTeam = searchParams.get('team');

  // 資料狀態
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]); // [新增] 團隊成員名單
  const [messages, setMessages] = useState<Message[]>([]); // 團隊大廳訊息
  const [taskMessages, setTaskMessages] = useState<Message[]>([]); // [新增] 任務專屬訊息
  
  // 輸入狀態
  const [newMessage, setNewMessage] = useState('');     // 大廳輸入框
  const [newTaskMessage, setNewTaskMessage] = useState(''); // 任務聊天輸入框

  // Modal 狀態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); 
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // 任務編輯狀態
  const [currentTask, setCurrentTask] = useState<TeamTask | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details'); // [新增] 任務Modal的分頁

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');

  // 表單資料
  const [formData, setFormData] = useState({ 
    id: '', 
    title: '', 
    description: '', 
    due_time: '', 
    assigned_to: [] as string[] // [修改] 支援多選
  });
  
  // WebSocket Refs
  const teamWsRef = useRef<WebSocket | null>(null);
  const taskWsRef = useRef<WebSocket | null>(null); // [新增] 任務專屬 WS
  const scrollRef = useRef<HTMLDivElement>(null);
  const taskChatScrollRef = useRef<HTMLDivElement>(null);

  // 1. 初始化團隊資料
  useEffect(() => {
    if (activeTeam) {
      fetchTasks();
      fetchTeamMembers(); // [新增] 獲取成員
      fetchMessages();    // 獲取大廳訊息
      
      // 連接團隊大廳 WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/${activeTeam}?username=${user}`;
      
      teamWsRef.current = new WebSocket(wsUrl);
      teamWsRef.current.onmessage = () => fetchMessages();

      return () => {
        teamWsRef.current?.close();
      };
    }
  }, [activeTeam, user]);

  // 2. 當打開任務編輯視窗時，連接該任務的聊天室
  useEffect(() => {
    if (showEditModal && currentTask && activeTab === 'chat') {
      // 檢查權限：只有被指派的人可以進入聊天
      if (!currentTask.assigned_to.includes(user || '')) {
         return; 
      }

      fetchTaskMessages(currentTask.id);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/${currentTask.id}?username=${user}`;
      
      taskWsRef.current = new WebSocket(wsUrl);
      taskWsRef.current.onmessage = () => fetchTaskMessages(currentTask.id);
      
      return () => {
        taskWsRef.current?.close();
      };
    }
  }, [showEditModal, currentTask, activeTab]);

  // 自動捲動
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { taskChatScrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [taskMessages]);

  // --- API 呼叫 ---

  const fetchTasks = async () => {
    if (!activeTeam) return;
    try {
      const res = await api.get(`/tasks/team/${encodeURIComponent(activeTeam)}`);
      setTasks(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTeamMembers = async () => {
    if (!activeTeam) return;
    try {
      const res = await api.get(`/teams/${encodeURIComponent(activeTeam)}`);
      setTeamMembers(res.data.members || []);
    } catch (err) { console.error("無法獲取成員", err); }
  };

  const fetchMessages = async () => {
    if (!activeTeam) return;
    try {
      const res = await api.get(`/ws/history/${activeTeam}`);
      setMessages(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTaskMessages = async (taskId: string) => {
    try {
      const res = await api.get(`/ws/history/${taskId}`);
      setTaskMessages(res.data);
    } catch (err) { console.error(err); }
  };

  // --- 動作處理 ---

  const sendTeamMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamWsRef.current && newMessage.trim()) {
      teamWsRef.current.send(newMessage);
      setNewMessage('');
    }
  };

  const sendTaskMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskWsRef.current && newTaskMessage.trim()) {
      taskWsRef.current.send(newTaskMessage);
      setNewTaskMessage('');
    }
  };

  // 處理指派人員勾選
  const handleAssignToggle = (username: string) => {
    setFormData(prev => {
      const current = prev.assigned_to;
      if (current.includes(username)) {
        return { ...prev, assigned_to: current.filter(u => u !== username) };
      } else {
        return { ...prev, assigned_to: [...current, username] };
      }
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;
    setIsSubmitting(true);
    try {
      await api.post('/tasks/team/', {
        title: formData.title,
        description: formData.description,
        due_time: formData.due_time || null,
        team: activeTeam,
        assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : [user]
      });
      await fetchTasks();
      setShowCreateModal(false);
      resetForm();
    } catch (err) { alert('創建任務失敗'); } finally { setIsSubmitting(false); }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/tasks/team/${formData.id}`, {
        title: formData.title,
        description: formData.description,
        due_time: formData.due_time || null,
        assigned_to: formData.assigned_to
      });
      await fetchTasks();
      setShowEditModal(false);
      resetForm();
    } catch (err) { alert('更新失敗，您可能沒有權限'); } finally { setIsSubmitting(false); }
  };

  const toggleComplete = async (task: TeamTask) => {
    try {
      // 權限檢查
      if (!task.assigned_to.includes(user || '')) {
         alert("您沒有權限完成此任務");
         return;
      }
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
      await api.put(`/tasks/team/${task.id}`, { is_completed: !task.is_completed });
    } catch (err) { fetchTasks(); }
  };

  const handleDeleteTask = async (task: TeamTask) => {
    if (!task.assigned_to.includes(user || '')) {
        alert("您沒有權限刪除此任務");
        return;
    }
    if (!window.confirm("確定要刪除這個任務嗎？")) return;
    try {
      await api.delete(`/tasks/team/${task.id}`);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) { alert('刪除失敗'); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !inviteUsername) return;
    setIsSubmitting(true);
    try {
      await api.post(`/teams/${encodeURIComponent(activeTeam)}/members`, { username: inviteUsername });
      alert(`成功邀請 ${inviteUsername} 加入團隊！`);
      fetchTeamMembers(); // 重新整理成員名單
      setShowInviteModal(false);
      setInviteUsername('');
    } catch (err: any) { alert(err.response?.data?.detail || '邀請失敗'); } finally { setIsSubmitting(false); }
  };

  const openEditModal = (task: TeamTask) => {
    setCurrentTask(task);
    setFormData({
      id: task.id,
      title: task.title,
      description: task.description || '',
      due_time: task.due_time ? new Date(task.due_time).toISOString().slice(0, 16) : '', 
      assigned_to: task.assigned_to
    });
    setActiveTab('details'); // 重置為詳情頁
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ id: '', title: '', description: '', due_time: '', assigned_to: [user || ''] });
    setCurrentTask(null);
  };

  // Helper: 檢查是否有權限
  const hasPermission = (task: TeamTask) => task.assigned_to.includes(user || '');

  if (!activeTeam) return <div>請選擇團隊</div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* 任務看板區 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              {activeTeam} <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md">TEAM</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm mt-1">共 {teamMembers.length} 位成員</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all">
              <UserPlus size={18} /> 邀請
            </button>
            <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-600 transition-all">
              <Plus size={18} /> 新增任務
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {tasks.map((task) => {
            const isAssigned = hasPermission(task);
            return (
              <div key={task.id} className={`group bg-white p-5 rounded-2xl border transition-all ${task.is_completed ? 'border-green-200 bg-green-50/30' : 'border-slate-100 hover:shadow-md'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={(e) => { e.stopPropagation(); toggleComplete(task); }} className={`transition-colors ${task.is_completed ? 'text-green-500' : 'text-slate-300 hover:text-indigo-600'}`}>
                      {task.is_completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                    </button>
                    <h3 onClick={() => openEditModal(task)} className={`font-bold text-lg cursor-pointer hover:text-indigo-600 transition-colors ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </h3>
                  </div>
                  
                  {/* 如果未被指派，顯示鎖頭或隱藏操作 */}
                  {isAssigned ? (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(task)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteTask(task)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  ) : (
                    <Lock size={16} className="text-slate-300" />
                  )}
                </div>

                <div className="pl-9 flex items-center gap-4 text-xs font-bold text-slate-400">
                  {task.due_time && (
                    <div className={`flex items-center gap-1.5 ${new Date(task.due_time) < new Date() && !task.is_completed ? 'text-red-500' : ''}`}>
                      <Calendar size={14} /> {new Date(task.due_time).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">
                     <Users size={14} /> {task.assigned_to.length} 人負責
                  </div>
                  {/* 顯示前幾個負責人名字 */}
                  <div className="flex -space-x-2">
                    {task.assigned_to.slice(0, 3).map(u => (
                        <div key={u} className="w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] text-slate-600" title={u}>
                            {u[0].toUpperCase()}
                        </div>
                    ))}
                    {task.assigned_to.length > 3 && <span className="text-[10px] pl-3">+{task.assigned_to.length - 3}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 團隊大廳聊天 (保持不變) */}
      <div className="w-80 flex flex-col bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-50 bg-slate-50/50 font-bold text-slate-700 flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-500"/> 團隊大廳
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 bg-slate-50/30">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.sender === user ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2 rounded-xl text-xs font-medium ${msg.sender === user ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border'}`}>
                    {msg.content}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">{msg.sender}</span>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
        <form onSubmit={sendTeamMessage} className="p-3 bg-white border-t flex gap-2">
            <input type="text" placeholder="發送訊息..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-xs outline-none" />
            <button className="p-2 bg-indigo-600 text-white rounded-lg"><Send size={14} /></button>
        </form>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-4">
                <h3 className="font-bold text-lg">新增團隊任務</h3>
                <input type="text" placeholder="標題" className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border focus:border-indigo-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                <textarea placeholder="描述" className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border focus:border-indigo-500" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="datetime-local" className="px-4 py-3 bg-slate-50 rounded-xl border" value={formData.due_time} onChange={e => setFormData({...formData, due_time: e.target.value})} />
                    
                    {/* 指派人員多選區 */}
                    <div className="p-3 bg-slate-50 rounded-xl border max-h-32 overflow-y-auto custom-scrollbar">
                        <p className="text-xs font-bold text-slate-500 mb-2">指派給：</p>
                        {teamMembers.map(member => (
                            <label key={member} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                                <input type="checkbox" checked={formData.assigned_to.includes(member)} onChange={() => handleAssignToggle(member)} className="rounded text-indigo-600" />
                                {member} {member === user && '(我)'}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
                    <button onClick={handleCreateTask} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">新增</button>
                </div>
            </div>
        </div>
      )}

      {/* Edit Modal (包含詳情與任務聊天) */}
      {showEditModal && currentTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Modal Header & Tabs */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex gap-4">
                        <button onClick={() => setActiveTab('details')} className={`text-sm font-bold pb-1 ${activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>任務詳情</button>
                        <button 
                            onClick={() => setActiveTab('chat')} 
                            disabled={!hasPermission(currentTask)}
                            className={`text-sm font-bold pb-1 flex items-center gap-1 ${activeTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 disabled:opacity-50'}`}
                        >
                            任務討論區 { !hasPermission(currentTask) && <Lock size={10} />}
                        </button>
                    </div>
                    <button onClick={() => setShowEditModal(false)}><X size={20} className="text-slate-400" /></button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {activeTab === 'details' ? (
                        <div className="space-y-4">
                            {!hasPermission(currentTask) && <div className="p-3 bg-orange-50 text-orange-600 text-xs rounded-lg font-bold">您不是此任務的負責人，僅供檢視。</div>}
                            
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">標題</label>
                                <input disabled={!hasPermission(currentTask)} type="text" className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border focus:border-indigo-500 disabled:opacity-60" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">描述</label>
                                <textarea disabled={!hasPermission(currentTask)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border focus:border-indigo-500 disabled:opacity-60" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">截止時間</label>
                                    <input disabled={!hasPermission(currentTask)} type="datetime-local" className="w-full px-4 py-3 bg-slate-50 rounded-xl border disabled:opacity-60" value={formData.due_time} onChange={e => setFormData({...formData, due_time: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">指派人員</label>
                                    <div className={`p-3 bg-slate-50 rounded-xl border max-h-32 overflow-y-auto custom-scrollbar ${!hasPermission(currentTask) ? 'opacity-60 pointer-events-none' : ''}`}>
                                        {teamMembers.map(member => (
                                            <label key={member} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                                                <input type="checkbox" checked={formData.assigned_to.includes(member)} onChange={() => handleAssignToggle(member)} className="rounded text-indigo-600" />
                                                {member}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {hasPermission(currentTask) && (
                                <button onClick={handleUpdateTask} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl mt-4">儲存變更</button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full h-[300px]">
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {taskMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.sender === user ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-3 py-2 rounded-xl text-xs font-medium ${msg.sender === user ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">{msg.sender}</span>
                                    </div>
                                ))}
                                <div ref={taskChatScrollRef} />
                            </div>
                            <form onSubmit={sendTaskMessage} className="mt-4 flex gap-2">
                                <input type="text" autoFocus placeholder="討論這個任務..." value={newTaskMessage} onChange={e => setNewTaskMessage(e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border rounded-xl outline-none" />
                                <button className="p-2 bg-indigo-600 text-white rounded-xl"><Send size={16} /></button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Invite Modal (保持不變) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-lg">邀請成員</h3>
            <input type="text" placeholder="使用者帳號" className="w-full px-4 py-3 border rounded-xl" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} />
            <div className="flex gap-2">
                <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
                <button onClick={handleInvite} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">邀請</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamWorkspace;