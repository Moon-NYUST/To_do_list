import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
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
  Trash2,
  Edit2,
  UserPlus,
  Lock,
  Wifi,
  WifiOff,
  Trello,
  List as ListIcon,
  Calendar as CalendarIcon,
  ListChecks,
  PlusSquare,
  Check,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import KanbanBoard from '../components/KanbanBoard';
import CalendarView from '../components/CalendarView';
import DraggableChat from '../components/DraggableChat';
import { useTheme } from '../context/ThemeContext';

// --- 型別定義 ---
interface TeamTask {
  id: string;
  title: string;
  description?: string;
  due_time?: string;
  status: string;
  is_completed: boolean;
  team: string;
  assigned_to: string[];
  created_at: string;
}

interface Message {
  id?: number;
  sender: string;
  content: string;
  timestamp: string;
}

interface SubTask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

const TeamWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTeam = searchParams.get('team');
  const queryClient = useQueryClient();

  const getAvatarUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  // 1. 取得任務列表 (React Query)
  const { data: tasks = [], refetch: refetchTasks } = useQuery<TeamTask[]>({
    queryKey: ['teamTasks', activeTeam],
    queryFn: async () => {
      if (!activeTeam) return [];
      const res = await api.get(`/tasks/team/${encodeURIComponent(activeTeam)}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!activeTeam
  });

  // --- 資料狀態 ---
  const [teamMembers, setTeamMembers] = useState<{ username: string, avatar: string | null }[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [taskMessages, setTaskMessages] = useState<Message[]>([]);
  const [readStatuses, setReadStatuses] = useState<{ username: string, last_read_message_id: number, avatar: string | null }[]>([]);

  // 1.5 取得成員在線狀態
  const { data: onlineMembers = [] } = useQuery<string[]>({
    queryKey: ['onlineMembers', teamMembers.map(m => m.username)],
    queryFn: async () => {
      if (teamMembers.length === 0) return [];
      const res = await api.post('/attendance/status', { usernames: teamMembers.map(m => m.username) });
      return res.data;
    },
    enabled: teamMembers.length > 0,
    refetchInterval: 30000 // 每 30 秒更新一次
  });

  // --- 連線狀態 ---
  const [isTeamWsReady, setIsTeamWsReady] = useState(false);
  const [isTaskWsReady, setIsTaskWsReady] = useState(false);

  // --- 輸入狀態 ---
  const [newMessage, setNewMessage] = useState('');
  const [newTaskMessage, setNewTaskMessage] = useState('');

  // --- Modal 狀態 ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // --- 任務編輯狀態 ---
  const [currentTask, setCurrentTask] = useState<TeamTask | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'subtasks'>('details');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');

  // --- 表單資料 ---
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    due_time: '',
    assigned_to: [] as string[]
  });

  // --- 聊天分頁狀態 ---
  const [msgOffset, setMsgOffset] = useState(0);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  // --- 子任務狀態 ---
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [tasksSubtasks, setTasksSubtasks] = useState<Record<string, SubTask[]>>({});

  // --- 獨立聊天室狀態 ---
  const [poppedOutChats, setPoppedOutChats] = useState<Set<string>>(new Set());

  // --- Refs ---
  const teamWsRef = useRef<WebSocket | null>(null);
  const taskWsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taskChatScrollRef = useRef<HTMLDivElement>(null);
  const lastReadIdRef = useRef<number>(0);

  // --- Helper: 格式化時間 (新增) ---
  const formatMsgTime = (isoTime: string) => {
    if (!isoTime) return '';
    try {
      return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // --- 衍生狀態：優先級排序 ---
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // 1. 是否指派給我
      const aAssigned = Array.isArray(a.assigned_to) && a.assigned_to.includes(user || '');
      const bAssigned = Array.isArray(b.assigned_to) && b.assigned_to.includes(user || '');
      if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;

      // 2. 狀態優先級 (進行中 > 待處理 > 已完成)
      const statusWeight: Record<string, number> = {
        'in_progress': 0,
        'todo': 1,
        'done': 2
      };

      const aWeight = statusWeight[a.status] ?? 99;
      const bWeight = statusWeight[b.status] ?? 99;
      if (aWeight !== bWeight) return aWeight - bWeight;

      // 3. 建立時間 (由新到舊)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, user]);

  // --- Helper: 取得正確的 WebSocket URL ---
  const getWebSocketUrl = (endpoint: string, params: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;

    let port = '';
    if (window.location.port) {
      if (!host.includes('ngrok') && !host.includes('railway')) {
        port = ':8000';
      }
    } else if (host === 'localhost' || host === '127.0.0.1') {
      port = ':8000';
    }

    return `${protocol}//${host}${port}${endpoint}${params}`;
  };

  // --- API 呼叫 ---

  const fetchTeamMembers = useCallback(async () => {
    if (!activeTeam) return;
    try {
      const res = await api.get(`/teams/${encodeURIComponent(activeTeam)}`);
      if (res.data && Array.isArray(res.data.member_details)) {
        setTeamMembers(res.data.member_details);
      } else {
        setTeamMembers([]);
      }
    } catch (err) {
      console.error("Fetch Members Error:", err);
      setTeamMembers([]);
    }
  }, [activeTeam]);

  const fetchMessages = useCallback(async (isLoadMore = false) => {
    if (!activeTeam) return;
    try {
      if (isLoadMore) setIsLoadingMore(true);

      const currentOffset = isLoadMore ? msgOffset + PAGE_SIZE : 0;
      const res = await api.get(`/ws/history/${activeTeam}?limit=${PAGE_SIZE}&offset=${currentOffset}`);

      const newMsgs = Array.isArray(res.data) ? res.data : [];

      if (isLoadMore) {
        setMessages(prev => [...newMsgs, ...prev]);
        setMsgOffset(currentOffset);
      } else {
        setMessages(newMsgs);
        setMsgOffset(0);
      }

      if (newMsgs.length < PAGE_SIZE) {
        setHasMoreMsgs(false);
      } else {
        setHasMoreMsgs(true);
      }
    } catch (err) {
      console.error("Fetch Messages Error:", err);
      if (!isLoadMore) setMessages([]);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeTeam, msgOffset]);

  const fetchTaskMessages = useCallback(async (taskId: string) => {
    try {
      const res = await api.get(`/ws/history/${taskId}`);
      setTaskMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch Task Messages Error:", err);
      setTaskMessages([]);
    }
  }, []);

  const fetchReadStatus = useCallback(async () => {
    if (!activeTeam || !user) return;
    try {
      const res = await api.get(`/ws/read-status/${activeTeam}`);
      setReadStatuses(res.data);
      // 更新本地已讀紀錄 ref，避免重複發送
      const myStatus = res.data.find((rs: any) => rs.username === user);
      if (myStatus && myStatus.last_read_message_id > lastReadIdRef.current) {
        lastReadIdRef.current = myStatus.last_read_message_id;
      }
    } catch (err) {
      console.error("Fetch Read Status Error:", err);
    }
  }, [activeTeam, user]);

  const toggleSubtasks = async (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
        // 如果還沒有快取，則抓取
        if (!tasksSubtasks[taskId]) {
          api.get(`/subtasks/${taskId}`).then(res => {
            setTasksSubtasks(old => ({ ...old, [taskId]: res.data }));
          }).catch(console.error);
        }
      }
      return next;
    });
  };

  const handleToggleSubTaskInList = async (taskId: string, subtaskId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/subtasks/${subtaskId}?is_completed=${!currentStatus}`);
      setTasksSubtasks(prev => ({
        ...prev,
        [taskId]: prev[taskId].map(st => st.id === subtaskId ? { ...st, is_completed: !currentStatus } : st)
      }));
    } catch (err) {
      alert('更新子任務失敗');
    }
  };

  const fetchSubtasks = useCallback(async (taskId: string) => {
    try {
      const res = await api.get(`/subtasks/${taskId}`);
      setSubtasks(res.data);
    } catch (err) {
      console.error("Fetch Subtasks Error:", err);
    }
  }, []);

  const handleAddSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTaskTitle.trim() || !currentTask) return;
    try {
      const res = await api.post('/subtasks/', {
        task_id: currentTask.id,
        title: newSubTaskTitle.trim(),
        is_completed: false
      });
      setSubtasks(prev => [...prev, res.data]);
      setNewSubTaskTitle('');
    } catch (err) {
      alert('新增子任務失敗');
    }
  };

  const handleToggleSubTask = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/subtasks/${id}?is_completed=${!currentStatus}`);
      setSubtasks(prev => prev.map(st => st.id === id ? { ...st, is_completed: !currentStatus } : st));
    } catch (err) {
      alert('更新子任務失敗');
    }
  };

  const handleDeleteSubTask = async (id: string) => {
    try {
      await api.delete(`/subtasks/${id}`);
      setSubtasks(prev => prev.filter(st => st.id !== id));
    } catch (err) {
      alert('刪除子任務失敗');
    }
  };

  const markAsRead = async (lastMsgId: number) => {
    if (!activeTeam || !user || lastMsgId <= lastReadIdRef.current) return;
    try {
      lastReadIdRef.current = lastMsgId; // 預先更新避免重複發送
      await api.post(`/ws/read/${activeTeam}?username=${user}&last_message_id=${lastMsgId}`);
    } catch (err) {
      console.error("Mark as read failed:", err);
    }
  };

  // --- WebSocket 連線邏輯 ---

  // 1. 初始化團隊資料與大廳 WebSocket
  useEffect(() => {
    if (activeTeam) {
      fetchTeamMembers();
      fetchMessages();
      fetchReadStatus();

      const wsUrl = getWebSocketUrl(`/ws/${activeTeam}`, `?username=${user}`);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => setIsTeamWsReady(true);
      ws.onclose = () => setIsTeamWsReady(false);
      ws.onerror = (error) => setIsTeamWsReady(false);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'TASK_UPDATE') {
            queryClient.invalidateQueries({ queryKey: ['teamTasks', activeTeam] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          } else if (data.type === 'READ_UPDATE') {
            fetchReadStatus();
            return; // 已讀更新不需要重新抓取訊息列表，防止無限迴圈
          }
        } catch (e) {
          // It's probably a plain string chat message, or parse failed
        }
        setTimeout(() => {
          fetchMessages();
          fetchReadStatus();
        }, 200);
      };

      teamWsRef.current = ws;

      return () => {
        ws.close();
      };
    }
  }, [activeTeam, user, fetchTeamMembers, fetchMessages]);

  // 2. 任務聊天室 WebSocket
  useEffect(() => {
    if (showEditModal && currentTask && activeTab === 'chat') {
      if (!currentTask.assigned_to.includes(user || '')) return;

      fetchTaskMessages(currentTask.id);

      const wsUrl = getWebSocketUrl(`/ws/${currentTask.id}`, `?username=${user}`);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => setIsTaskWsReady(true);
      ws.onclose = () => setIsTaskWsReady(false);
      ws.onerror = () => setIsTaskWsReady(false);

      ws.onmessage = () => {
        setTimeout(() => fetchTaskMessages(currentTask.id), 200);
      };

      taskWsRef.current = ws;

      return () => {
        ws.close();
        setIsTaskWsReady(false);
      };
    }
  }, [showEditModal, currentTask, activeTab, user, fetchTaskMessages]);

  // 自動捲動
  useEffect(() => {
    // 只有在新的訊息進來 (Offset 為 0) 時才自動捲動到底部
    if (msgOffset === 0) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.id) markAsRead(lastMsg.id);
    }
  }, [messages, activeTeam, msgOffset]);
  useEffect(() => { taskChatScrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [taskMessages]);

  // 當 URL 中有 taskId 時，自動開啟詳情 Modal
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setCurrentTask(task);
        setFormData({
          id: task.id,
          title: task.title,
          description: task.description || '',
          due_time: task.due_time ? new Date(task.due_time).toISOString().slice(0, 16) : '',
          assigned_to: task.assigned_to
        });
        fetchSubtasks(task.id);
        setShowEditModal(true);
      }
    }
  }, [searchParams, tasks, fetchSubtasks]);


  // --- 動作處理 ---

  const sendTeamMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamWsRef.current && teamWsRef.current.readyState === WebSocket.OPEN && newMessage.trim()) {
      teamWsRef.current.send(newMessage);
      setNewMessage('');
    }
  };

  const sendTaskMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskWsRef.current && taskWsRef.current.readyState === WebSocket.OPEN && newTaskMessage.trim()) {
      taskWsRef.current.send(newTaskMessage);
      setNewTaskMessage('');
    }
  };

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
      // Invalidate to trigger update across clients (and locally)
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowCreateModal(false);
      resetForm();
    } catch (err) { alert('創建任務失敗'); } finally { setIsSubmitting(false); }
  };
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const isCompleted = newStatus === 'done';
      await api.put(`/tasks/team/${taskId}`, {
        status: newStatus,
        is_completed: isCompleted
      });
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      alert('更新狀態失敗');
      refetchTasks();
    }
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
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowEditModal(false);
      resetForm();
    } catch (err) { alert('更新失敗'); } finally { setIsSubmitting(false); }
  };

  const toggleComplete = async (task: TeamTask) => {
    try {
      if (!task.assigned_to.includes(user || '')) {
        alert("您沒有權限完成此任務");
        return;
      }
      await api.put(`/tasks/team/${task.id}`, { is_completed: !task.is_completed });
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) { refetchTasks(); }
  };

  const handleDeleteTask = async (task: TeamTask) => {
    if (!task.assigned_to.includes(user || '')) {
      alert("您沒有權限刪除此任務");
      return;
    }
    if (!window.confirm("確定要刪除這個任務嗎？")) return;
    try {
      await api.delete(`/tasks/team/${task.id}`);
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) { alert('刪除失敗'); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !inviteUsername) return;
    setIsSubmitting(true);
    try {
      await api.post(`/teams/${encodeURIComponent(activeTeam)}/members`, { username: inviteUsername });
      alert(`成功邀請 ${inviteUsername} 加入團隊！`);
      fetchTeamMembers();
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
      assigned_to: Array.isArray(task.assigned_to) ? task.assigned_to : []
    });
    setActiveTab('details');
    fetchSubtasks(task.id);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ id: '', title: '', description: '', due_time: '', assigned_to: [user || ''] });
    setCurrentTask(null);
  };

  const hasPermission = (task: TeamTask) => Array.isArray(task.assigned_to) && task.assigned_to.includes(user || '');

  if (!activeTeam) return <div>請選擇團隊</div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* 任務看板區 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div>
              <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {activeTeam} <span className="text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-md">TEAM</span>
              </h2>
              <p className="text-slate-500 font-medium text-sm mt-1">共 {teamMembers?.length || 0} 位成員</p>
            </div>

            {/* View Switcher */}
            <div className={`flex items-center p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ListIcon size={14} /> 列表
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Trello size={14} /> 看板
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
              >
                <CalendarIcon size={14} /> 日曆
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowInviteModal(true)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border ${theme === 'dark' ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              <UserPlus size={18} /> 邀請
            </button>
            <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all">
              <Plus size={18} /> 新增任務
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {viewMode === 'list' ? (
            <div className="space-y-8">
              {[
                { id: 'todo', label: '待處理', icon: <Circle size={14} />, color: 'bg-slate-500' },
                { id: 'in_progress', label: '進行中', icon: <Wifi size={14} />, color: 'bg-primary-500' },
                { id: 'done', label: '已完成', icon: <CheckCircle size={14} />, color: 'bg-emerald-500' }
              ].map(section => {
                const sectionTasks = Array.isArray(sortedTasks) ? sortedTasks.filter(t => (section.id === 'done' ? t.is_completed : (!t.is_completed && (t.status === section.id || (section.id === 'todo' && !t.status))))) : [];

                if (sectionTasks.length === 0) return null;

                return (
                  <div key={section.id} className="space-y-3">
                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                      <div className={`w-2 h-2 rounded-full ${section.color}`}></div>
                      {section.label} ({sectionTasks.length})
                    </h4>
                    <div className="space-y-3">
                      {sectionTasks.map((task) => {
                        const isAssigned = hasPermission(task);
                        return (
                          <div key={task.id} className={`group p-5 rounded-2xl border transition-all ${theme === 'dark' ? (task.is_completed ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700') : (task.is_completed ? 'border-green-200 bg-green-50/30' : 'bg-white border-slate-100 hover:shadow-md')}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3 flex-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleSubtasks(task.id); }}
                                  className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                                >
                                  {expandedTasks.has(task.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); toggleComplete(task); }} className={`transition-colors ${task.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}>
                                  {task.is_completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                                </button>
                                <h3 onClick={() => openEditModal(task)} className={`font-bold text-lg cursor-pointer hover:text-primary-500 transition-colors ${task.is_completed ? (theme === 'dark' ? 'text-slate-600' : 'text-slate-400') + ' line-through' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-800')}`}>
                                  {task.title}
                                </h3>
                              </div>

                              {isAssigned ? (
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditModal(task)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-primary-400 hover:bg-slate-800' : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50'}`}><Edit2 size={16} /></button>
                                  <button onClick={() => handleDeleteTask(task)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}><Trash2 size={16} /></button>
                                </div>
                              ) : (
                                <Lock size={16} className="text-slate-600" />
                              )}
                            </div>

                            <div className="pl-9 flex items-center gap-4 text-xs font-bold text-slate-500">
                              {task.due_time && (
                                <div className={`flex items-center gap-1.5 ${new Date(task.due_time) < new Date() && !task.is_completed ? 'text-rose-500' : ''}`}>
                                  <Calendar size={14} /> {new Date(task.due_time).toLocaleDateString()}
                                </div>
                              )}
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${theme === 'dark' ? 'text-primary-400 bg-primary-950/50' : 'text-primary-600 bg-primary-50'}`}>
                                <Users size={14} /> {(task.assigned_to || []).length} 人負責
                              </div>
                              <div className="flex -space-x-2">
                                {Array.isArray(task.assigned_to) && task.assigned_to.slice(0, 3).map(u => {
                                  const mInfo = teamMembers.find(m => m.username === u);
                                  return (
                                    <div key={u} className={`w-5 h-5 rounded-full border border-2 overflow-hidden flex items-center justify-center text-[8px] font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-900 text-slate-400' : 'bg-slate-200 border-white text-slate-600'}`} title={u}>
                                      {mInfo?.avatar ? (
                                        <img src={getAvatarUrl(mInfo.avatar) || ''} alt={u} className="w-full h-full object-cover" />
                                      ) : (
                                        u ? u[0].toUpperCase() : '?'
                                      )}
                                    </div>
                                  );
                                })}
                                {(task.assigned_to || []).length > 3 && <span className="text-[10px] pl-3">+{(task.assigned_to || []).length - 3}</span>}
                              </div>
                            </div>

                            {expandedTasks.has(task.id) && (
                              <div className="mt-4 ml-9 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4 animate-in slide-in-from-top-2 duration-200">
                                {!tasksSubtasks[task.id] ? (
                                  <div className="text-[10px] text-slate-400 animate-pulse">載入中...</div>
                                ) : tasksSubtasks[task.id].length === 0 ? (
                                  <div className="text-[10px] text-slate-400 italic">無子任務</div>
                                ) : (
                                  tasksSubtasks[task.id].map(st => (
                                    <div key={st.id} className="flex items-center gap-2 group/st">
                                      <button
                                        onClick={() => handleToggleSubTaskInList(task.id, st.id, st.is_completed)}
                                        className={`transition-colors ${st.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}
                                      >
                                        {st.is_completed ? <CheckCircle size={14} /> : <Circle size={14} />}
                                      </button>
                                      <span className={`text-xs font-medium ${st.is_completed ? 'line-through text-slate-400' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}`}>
                                        {st.title}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              tasks={sortedTasks}
              onUpdateStatus={handleUpdateTaskStatus}
              onEditTask={openEditModal}
              onToggleComplete={toggleComplete}
            />
          ) : (
            <CalendarView
              tasks={sortedTasks}
              onEditTask={openEditModal}
            />
          )}
        </div>
      </div>

      {/* 團隊大廳聊天 */}
      <div className={`w-80 flex flex-col rounded-[2rem] shadow-xl border overflow-hidden shrink-0 transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
        <div className={`p-4 border-b font-bold flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800 text-slate-300' : 'bg-slate-50/50 border-slate-50 text-slate-700'}`}>
          <div className="flex items-center gap-2"><MessageSquare size={18} className="text-primary-500" /> 團隊大廳</div>
          {isTeamWsReady ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-slate-600" />}
        </div>

        {/* 團隊成員列表 (新增) */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-900/30' : 'border-slate-100 bg-slate-50/30'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              <Users size={12} /> 成員 ({teamMembers.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => {
              const isOnline = onlineMembers.includes(member.username);
              return (
                <div key={member.username} className="relative group cursor-help" title={`${member.username} - ${isOnline ? '在線' : '離線'}`}>
                  <div className={`w-8 h-8 rounded-xl overflow-hidden border-2 transition-all ${isOnline ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] scale-110' : 'border-transparent grayscale opacity-60'}`}>
                    {member.avatar ? (
                      <img src={getAvatarUrl(member.avatar) || ''} alt={member.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        {member.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  {isOnline && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-white dark:border-slate-900 rounded-full animate-pulse"></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50/30'}`}>
          {hasMoreMsgs && (
            <div className="flex justify-center pb-2">
              <button
                onClick={() => fetchMessages(true)}
                disabled={isLoadingMore}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:border-primary-200 hover:text-primary-600 hover:bg-primary-50'} disabled:opacity-50`}
              >
                {isLoadingMore ? '載入中...' : '載入較早訊息'}
              </button>
            </div>
          )}
          {Array.isArray(messages) && messages.map((msg, idx) => {
            const isMe = msg.sender === user;
            const senderInfo = teamMembers.find(m => m.username === msg.sender);

            // 找出已讀此訊息的使用者 (不包含發送者自己)
            const readBy = readStatuses.filter(rs =>
              rs.username !== msg.sender &&
              rs.last_read_message_id >= (msg.id || 0)
            );

            return (
              <div key={idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* 1. 頭像區域 */}
                <div className="shrink-0">
                  <div className={`w-9 h-9 rounded-2xl overflow-hidden border-2 shadow-sm ${theme === 'dark' ? 'border-slate-800 bg-slate-800' : 'border-white bg-slate-200'}`}>
                    {senderInfo?.avatar ? (
                      <img src={getAvatarUrl(senderInfo.avatar) || ''} alt={msg.sender} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                        {msg.sender[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. 訊息內容區域 */}
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[10px] font-black text-slate-400 mb-1 ml-1">{msg.sender}</span>}

                  <div className={`px-4 py-2.5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm ${isMe
                    ? 'bg-primary-600 text-white rounded-tr-none'
                    : (theme === 'dark' ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none')
                    }`}>
                    {msg.content}
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    <span className="text-[9px] text-slate-400 font-medium">{formatMsgTime(msg.timestamp)}</span>

                    {/* 已讀小頭像 */}
                    {readBy.length > 0 && (
                      <div className="flex -space-x-1 ml-1 scale-75 origin-left">
                        {readBy.slice(0, 5).map(u => (
                          <div key={u.username} className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-900 overflow-hidden" title={`${u.username} 已讀`}>
                            {u.avatar ? (
                              <img src={getAvatarUrl(u.avatar) || ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-300 flex items-center justify-center text-[5px] font-bold">{u.username[0]}</div>
                            )}
                          </div>
                        ))}
                        {readBy.length > 5 && <span className="text-[8px] text-slate-400 pl-2">+{readBy.length - 5}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
        <form onSubmit={sendTeamMessage} className={`p-4 border-t flex gap-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <input
            type="text"
            placeholder={isTeamWsReady ? "發送訊息..." : "連線中..."}
            disabled={!isTeamWsReady}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 text-white focus:bg-slate-700 focus:ring-2 focus:ring-primary-900/50' : 'bg-slate-100 text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary-100'}`}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isTeamWsReady}
            className={`p-2.5 rounded-xl text-white transition-all shadow-lg ${newMessage.trim() && isTeamWsReady ? 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20' : 'bg-slate-700 cursor-not-allowed text-slate-500'
              }`}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-lg">新增團隊任務</h3>
            <input type="text" placeholder="標題" className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border focus:border-indigo-500" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            <textarea placeholder="描述" className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border focus:border-indigo-500" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <input type="datetime-local" className="px-4 py-3 bg-slate-50 rounded-xl border" value={formData.due_time} onChange={e => setFormData({ ...formData, due_time: e.target.value })} />

              <div className="p-3 bg-slate-50 rounded-xl border max-h-32 overflow-y-auto custom-scrollbar">
                <p className="text-xs font-bold text-slate-500 mb-2">指派給：</p>
                {Array.isArray(teamMembers) && teamMembers.map(member => (
                  <label key={member.username} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                    <input type="checkbox" checked={formData.assigned_to.includes(member.username)} onChange={() => handleAssignToggle(member.username)} className="rounded text-indigo-600 w-4 h-4" />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium text-slate-700">{member.username} {member.username === user && '(我)'}</span>
                      {onlineMembers.includes(member.username) && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          在線
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
              <button onClick={handleCreateTask} disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">新增</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (包含詳情與任務聊天) */}
      {showEditModal && currentTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <div className="flex gap-4">
                <button onClick={() => setActiveTab('details')} className={`text-sm font-bold pb-1 ${activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>任務詳情</button>
                <button
                  onClick={() => setActiveTab('subtasks')}
                  className={`text-sm font-bold pb-1 flex items-center gap-1 ${activeTab === 'subtasks' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
                >
                  子任務 ({subtasks.length})
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  disabled={!hasPermission(currentTask)}
                  className={`text-sm font-bold pb-1 flex items-center gap-1 ${activeTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 disabled:opacity-50'}`}
                >
                  任務討論區 {!hasPermission(currentTask) && <Lock size={10} />}
                </button>
              </div>
              <button onClick={() => setShowEditModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {activeTab === 'details' ? (
                <div className="space-y-4">
                  {!hasPermission(currentTask) && <div className="p-3 bg-orange-50 text-orange-600 text-xs rounded-lg font-bold">您不是此任務的負責人，僅供檢視。</div>}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">標題</label>
                    <input disabled={!hasPermission(currentTask)} type="text" className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border focus:border-indigo-500 disabled:opacity-60" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">描述</label>
                    <textarea disabled={!hasPermission(currentTask)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border focus:border-indigo-500 disabled:opacity-60" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">截止時間</label>
                      <input disabled={!hasPermission(currentTask)} type="datetime-local" className="w-full px-4 py-3 bg-slate-50 rounded-xl border disabled:opacity-60" value={formData.due_time} onChange={e => setFormData({ ...formData, due_time: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">指派人員</label>
                      <div className={`p-3 bg-slate-50 rounded-xl border max-h-32 overflow-y-auto custom-scrollbar ${!hasPermission(currentTask) ? 'opacity-60 pointer-events-none' : ''}`}>
                        {Array.isArray(teamMembers) && teamMembers.map(member => (
                          <label key={member.username} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                            <input type="checkbox" checked={formData.assigned_to.includes(member.username)} onChange={() => handleAssignToggle(member.username)} className="rounded text-indigo-600" />
                            {member.username}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {hasPermission(currentTask) && (
                    <button onClick={handleUpdateTask} disabled={isSubmitting} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl mt-4">儲存變更</button>
                  )}
                </div>
              ) : activeTab === 'subtasks' ? (
                <div className="space-y-4">
                  <form onSubmit={handleAddSubTask} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新增子任務..."
                      value={newSubTaskTitle}
                      onChange={e => setNewSubTaskTitle(e.target.value)}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                    />
                    <button type="submit" disabled={!newSubTaskTitle.trim()} className="p-2.5 bg-indigo-600 text-white rounded-xl disabled:opacity-50 shadow-lg shadow-indigo-500/20">
                      <PlusSquare size={20} />
                    </button>
                  </form>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {subtasks.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-sm italic">尚無子任務</div>
                    ) : (
                      subtasks.map(st => (
                        <div key={st.id} className={`flex items-center justify-between p-3 rounded-xl border group transition-all ${theme === 'dark' ? (st.is_completed ? 'bg-emerald-900/10 border-emerald-900/20 opacity-60' : 'bg-slate-800 border-slate-700') : (st.is_completed ? 'bg-green-50 border-green-100 opacity-60' : 'bg-white border-slate-100')}`}>
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleToggleSubTask(st.id, st.is_completed)} className={`transition-colors ${st.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}>
                              {st.is_completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                            </button>
                            <span className={`text-sm font-medium ${st.is_completed ? 'line-through text-slate-400' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-700')}`}>{st.title}</span>
                          </div>
                          <button onClick={() => handleDeleteSubTask(st.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full h-[300px]">
                  <button
                    onClick={() => {
                      if (currentTask) {
                        setPoppedOutChats(prev => new Set(prev).add(currentTask.id));
                        setShowEditModal(false);
                      }
                    }}
                    className="p-1 px-2 mb-2 self-end flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <MessageSquare size={12} /> 獨立視窗
                  </button>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {Array.isArray(taskMessages) && taskMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.sender === user ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-2 rounded-xl text-xs font-medium ${msg.sender === user ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                          {msg.content}
                        </div>
                        {/* [新增] 時間戳顯示 */}
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="text-[10px] text-slate-400 font-bold">{msg.sender}</span>
                          <span className="text-[9px] text-slate-300">{formatMsgTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                    <div ref={taskChatScrollRef} />
                  </div>
                  <form onSubmit={sendTaskMessage} className="mt-4 flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder={isTaskWsReady ? "討論這個任務..." : "連線中..."}
                      disabled={!isTaskWsReady}
                      value={newTaskMessage}
                      onChange={e => setNewTaskMessage(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border rounded-xl outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newTaskMessage.trim() || !isTaskWsReady}
                      className={`p-2 text-white rounded-xl ${newTaskMessage.trim() && isTaskWsReady ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-lg">邀請成員</h3>
            <input type="text" placeholder="使用者帳號" className="w-full px-4 py-3 border rounded-xl" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
              <button onClick={handleInvite} disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">邀請</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamWorkspace;