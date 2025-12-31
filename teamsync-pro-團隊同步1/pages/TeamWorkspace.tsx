import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Group, Panel, Separator } from "react-resizable-panels";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
  ChevronDown,
  History,
  Activity,
  BarChart2,
  GripVertical // [新增] 用於拖曳把手
} from 'lucide-react'
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
  completed_by?: string | null;
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
  completed_by?: string | null;
}

interface ActivityLog {
  id: number;
  user_name: string;
  action: 'checked' | 'unchecked';
  task_title: string;
  timestamp: string;
}

interface Contribution {
  username: string;
  main: number;
  sub: number;
  total: number;
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

  // Fetch Team Stats & Logs
  const { data: teamStats, refetch: refetchTeamStats } = useQuery<{ contributions: Contribution[], logs: ActivityLog[] }>({
    queryKey: ['teamStats', activeTeam],
    queryFn: async () => {
      if (!activeTeam) return { contributions: [], logs: [] };
      const res = await api.get(`/stats/team/${encodeURIComponent(activeTeam)}`);
      return res.data;
    },
    enabled: !!activeTeam,
    refetchInterval: 30000 // 每 30 秒更新一次
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
  const [lobbyTab, setLobbyTab] = useState<'chat' | 'stats' | 'log'>('chat');
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

  const handleToggleSubTaskInList = async (taskId: string, subtaskId: string, currentStatus: boolean, subtaskCompletedBy?: string | null) => {
    try {
      // 權限鎖定邏輯 (SubTask)
      if (currentStatus) {
        // 嘗試取消完成
        if (subtaskCompletedBy && subtaskCompletedBy !== user) {
          toast.error(`只有完成者 ${subtaskCompletedBy} 可以恢復此子任務`);
          return;
        }
      }

      const newStatus = !currentStatus;
      const completedBy = newStatus ? user : null;

      await api.patch(`/subtasks/${subtaskId}`, {
        is_completed: newStatus,
        completed_by: completedBy
      });

      // Refresh data
      fetchSubtasks(taskId);
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      refetchTeamStats();
    } catch (err) { }
  };

  const fetchSubtasks = useCallback(async (taskId: string) => {
  try {
    const res = await api.get(`/subtasks/${taskId}`);
    // 同時更新兩個狀態，確保列表和彈窗同步
    setSubtasks(res.data);
    setTasksSubtasks(prev => ({ ...prev, [taskId]: res.data }));
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

  // Handle Tab Change
  const handleLobbyTabChange = (tab: 'chat' | 'stats' | 'log') => {
    setLobbyTab(tab);
    if (tab !== 'chat') {
      refetchTeamStats();
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
        const data = JSON.parse(event.data);
        if (data.type === 'TASK_UPDATE') {
          refetchTasks(); // 重新抓取主任務
          refetchTeamStats(); // 重新抓取貢獻榜與日誌
          
          // [新增] 如果有特定的 taskId 更新，清除該任務在本地緩存的子任務，迫使下次展開時重新 fetch
          if (data.task_id) {
            setTasksSubtasks(prev => {
              const next = { ...prev };
              delete next[data.task_id]; // 刪除舊緩存
              return next;
            });
            // 這裡直接呼叫 fetchSubtasks 重新抓取資料並更新 tasksSubtasks
      // 如果該任務正處於展開狀態，這會讓它從「載入中」變回正確內容
            fetchSubtasks(data.task_id);
          }
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
    // 1. Optimistic Update (立即更新 UI)
    const previousTasks = queryClient.getQueryData<TeamTask[]>(['teamTasks', activeTeam]);

    queryClient.setQueryData<TeamTask[]>(['teamTasks', activeTeam], (old) => {
      if (!old) return [];
      return old.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus, is_completed: newStatus === 'done' }
          : task
      );
    });

    try {
      const isCompleted = newStatus === 'done';
      await api.put(`/tasks/team/${taskId}`, {
        status: newStatus,
        is_completed: isCompleted
      });
      // 成功後 Invalidate 確保資料一致 (雖然已經樂觀更新了)
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      alert('更新狀態失敗');
      // 失敗時回滾
      if (previousTasks) {
        queryClient.setQueryData(['teamTasks', activeTeam], previousTasks);
      }
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

      // 權限鎖定邏輯
      if (task.is_completed) {
        // 嘗試取消完成
        if (task.completed_by && task.completed_by !== user) {
          toast.error(`只有完成者 ${task.completed_by} 可以恢復此任務進度`);
          return;
        }
      }

      const newIsCompleted = !task.is_completed;
      const completedBy = newIsCompleted ? user : null;

      await api.put(`/tasks/team/${task.id}`, {
        is_completed: newIsCompleted,
        completed_by: completedBy
      });
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      refetchTeamStats();
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

  const handleDeleteTaskById = async (taskId: string) => {
    // 1. 權限檢查：必須是負責人才能刪除
    const task = tasks.find(t => t.id === taskId);
    if (!task) return; // 任務不存在

    if (!task.assigned_to.includes(user || '')) {
      alert("您沒有權限刪除此任務");
      // 為了防止 KanbanBoard 的樂觀更新造成視覺不一致，這裡不需要做額外處理，
      // 因為 KanbanBoard 會在 prop 更新時自動重置
      // 但為了更好的體驗，建議 KanbanBoard 內部若操作失敗應有 rollback 機制 (目前依賴 refetch)
      return;
    }

    // 用於看板拖曳刪除，不帶確認視窗
    try {
      // 先樂觀移除
      queryClient.setQueryData<TeamTask[]>(['teamTasks', activeTeam], (old) => {
        return old ? old.filter(t => t.id !== taskId) : [];
      });

      await api.delete(`/tasks/team/${taskId}`);
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      alert('刪除失敗');
      refetchTasks();
    }
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

  // ... 前面的代码保持不变 ...

  if (!activeTeam) return <div>請選擇團隊</div>;

  return (
    <Group direction="horizontal" className="h-[calc(100vh-8rem)]">
      
      {/* --- 左側：任務看板區 --- */}
      {/* 修改 1: defaultSize 改為 75，讓任務區預設更寬 */}
      <Panel defaultSize={75} minSize={60} className="pr-2">
        <div className="flex-1 flex flex-col min-w-0 h-full">
           {/* ... 左側內容保持不變 ... */}
           {/* (省略內部程式碼以節省空間，請保留你原本的內容) */}
           <div className="flex items-center justify-between mb-6">
              {/* Header 內容... */}
              <div className="flex items-center gap-6">
                <div>
                  <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    {activeTeam} <span className="text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-md">TEAM</span>
                  </h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">共 {teamMembers?.length || 0} 位成員</p>
                </div>
                 {/* ... View Switcher ... */}
                 <div className={`flex items-center p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}><ListIcon size={14} /> 列表</button>
                    <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}><Trello size={14} /> 看板</button>
                    <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}><CalendarIcon size={14} /> 日曆</button>
                 </div>
              </div>
              {/* Buttons... */}
              <div className="flex gap-3">
                 <button onClick={() => setShowInviteModal(true)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border ${theme === 'dark' ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><UserPlus size={18} /> 邀請</button>
                 <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all"><Plus size={18} /> 新增任務</button>
              </div>
           </div>

           {/* 看板內容區 */}
           <div
            className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
               // ... onDrop logic ...
               e.preventDefault();
               const content = e.dataTransfer.getData('text/plain');
               if (!content) return;
               try {
                 await api.post(`/tasks/team/`, { title: content.length > 20 ? content.slice(0, 20) + '...' : content, description: content, team: activeTeam, status: 'todo', assigned_to: [user] });
                 queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
                 queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
               } catch (err) { console.error(err); alert('無法將訊息轉換為任務'); }
            }}
          >
            {viewMode === 'list' ? (
              <div className="space-y-8">
                 {/* ... List View Content (Paste your original List View code here) ... */}
                 {/* 為節省顯示空間，此處省略，請保留原有的 List View 代碼 */}
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
                               <div key={task.id} className={`group p-5 rounded-2xl border transition-all ${theme === 'dark' ? (task.is_completed ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700') : (task.is_completed ? 'border-green-200 bg-green-50/30' : 'bg-white border-slate-100 hover:shadow-md')}`}
                               onClick={() => openEditModal(task)}
                               >
                                  {/* Task Card Content... (Paste original) */}
                                  <div className="flex items-start justify-between mb-2">
                                     <div className="flex items-center gap-3 flex-1">
                                        <button onClick={(e) => { e.stopPropagation(); toggleSubtasks(task.id); }} className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>{expandedTasks.has(task.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>
                                        <button onClick={(e) => { e.stopPropagation(); toggleComplete(task); }} className={`transition-colors ${task.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}>{task.is_completed ? <CheckCircle size={24} /> : <Circle size={24} />}</button>
                                        <h3 className={`font-bold text-lg cursor-pointer hover:text-primary-500 transition-colors ${task.is_completed ? (theme === 'dark' ? 'text-slate-600' : 'text-slate-400') + ' line-through' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-800')}`}>{task.title}</h3>
                                     </div>
                                     {isAssigned ? (
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button onClick={(e) => { e.stopPropagation(); setPoppedOutChats(prev => new Set(prev).add(task.id)); }} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`} title="開啟討論"><MessageSquare size={16} /></button>
                                           <button onClick={(e) => { e.stopPropagation(); openEditModal(task); }} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-primary-400 hover:bg-slate-800' : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50'}`}><Edit2 size={16} /></button>
                                           <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}><Trash2 size={16} /></button>
                                        </div>
                                     ) : <Lock size={16} className="text-slate-600" />}
                                  </div>
                                  <div className="pl-9 flex items-center gap-4 text-xs font-bold text-slate-500">
                                    {task.due_time && (<div className={`flex items-center gap-1.5 ${new Date(task.due_time) < new Date() && !task.is_completed ? 'text-rose-500' : ''}`}><Calendar size={14} /> {new Date(task.due_time).toLocaleDateString()}</div>)}
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${theme === 'dark' ? 'text-primary-400 bg-primary-950/50' : 'text-primary-600 bg-primary-50'}`}><Users size={14} /> {(task.assigned_to || []).length} 人負責</div>
                                     <div className="flex -space-x-2">
                                        {Array.isArray(task.assigned_to) && task.assigned_to.slice(0, 3).map(u => { const mInfo = teamMembers.find(m => m.username === u); return (<div key={u} className={`w-5 h-5 rounded-full border border-2 overflow-hidden flex items-center justify-center text-[8px] font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-900 text-slate-400' : 'bg-slate-200 border-white text-slate-600'}`} title={u}>{mInfo?.avatar ? (<img src={getAvatarUrl(mInfo.avatar) || ''} alt={u} className="w-full h-full object-cover" />) : (u ? u[0].toUpperCase() : '?')}</div>); })}
                                        {(task.assigned_to || []).length > 3 && <span className="text-[10px] pl-3">+{(task.assigned_to || []).length - 3}</span>}
                                     </div>
                                  </div>
                                  {expandedTasks.has(task.id) && (
                                     <div className="mt-4 ml-9 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4 animate-in slide-in-from-top-2 duration-200">
                                      {task.is_completed && task.completed_by && (<div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 w-fit text-[10px]"><Check size={12} /><span className="font-bold">由 {task.completed_by} 完成</span></div>)}
                                      {!tasksSubtasks[task.id] ? (<div className="text-[10px] text-slate-400 animate-pulse">載入中...</div>) : tasksSubtasks[task.id].length === 0 ? (<div className="text-[10px] text-slate-400 italic">無子任務</div>) : (tasksSubtasks[task.id].map(st => (<div key={st.id} className="flex items-start gap-2 group/st flex-col sm:flex-row sm:items-center"><div className="flex items-center gap-2"><button onClick={(e) => {e.stopPropagation(); handleToggleSubTaskInList(task.id, st.id, st.is_completed, st.completed_by)}} className={`transition-colors ${st.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}>{st.is_completed ? <CheckCircle size={14} /> : <Circle size={14} />}</button><span className={`text-xs font-medium ${st.is_completed ? 'line-through text-slate-400' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}`}>{st.title}</span></div>{st.is_completed && st.completed_by && (<span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-6 sm:ml-0">{st.completed_by} 完成</span>)}</div>)))}
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
              <KanbanBoard tasks={sortedTasks} onUpdateStatus={handleUpdateTaskStatus} onEditTask={openEditModal} onToggleComplete={toggleComplete} onDeleteTask={handleDeleteTaskById} tasksSubtasks={tasksSubtasks} />
            ) : (
              <CalendarView tasks={sortedTasks} onEditTask={openEditModal} onTaskUpdate={() => { queryClient.invalidateQueries({ queryKey: ['teamTasks'] }); queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }); }} />
            )}
          </div>
        </div>
      </Panel>

      {/* --- 拖曳把手 --- */}
      <Separator className="w-4 flex items-center justify-center cursor-col-resize hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded transition-colors group z-10 focus:outline-none">
        <div className="w-1 h-8 bg-slate-300 dark:bg-slate-600 rounded-full group-hover:bg-primary-500 transition-colors" />
      </Separator>

      {/* --- 右側：團隊大廳 --- */}
      {/* 修改 2: defaultSize=25, minSize=0, collapsible=true (允許完全收起) */}
      <Panel defaultSize={25} minSize={20} maxSize={50} collapsible={true} onCollapse={() => console.log('collapsed')} className="pl-2">
        {/* 修改 3: 增加 min-w-[320px] 防止內容被擠壓變形 */}
        <div className={`w-full h-full flex flex-col rounded-[2rem] shadow-xl border overflow-hidden shrink-0 transition-colors min-w-[320px] ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
          
          {/* 大廳內容 (Header) 保持不變 */}
          <div className={`p-4 border-b font-bold flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800 text-slate-300' : 'bg-slate-50/50 border-slate-50 text-slate-700'}`}>
            <div className="flex items-center gap-2"><MessageSquare size={18} className="text-primary-500" /> 團隊大廳</div>
            {isTeamWsReady ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-slate-600" />}
          </div>

          {/* ... (其餘 Tabs 和聊天內容完全保持不變) ... */}
          <div className={`flex items-center gap-1 p-1 rounded-lg mb-4 mx-4 mt-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button onClick={() => handleLobbyTabChange('chat')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${lobbyTab === 'chat' ? (theme === 'dark' ? 'bg-slate-700 shadow-sm text-primary-400' : 'bg-white shadow-sm text-primary-600') : 'text-slate-500 hover:text-primary-500' }`}><MessageSquare size={14} /> 聊天</button>
            <button onClick={() => handleLobbyTabChange('stats')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${lobbyTab === 'stats' ? (theme === 'dark' ? 'bg-slate-700 shadow-sm text-violet-400' : 'bg-white shadow-sm text-violet-600') : 'text-slate-500 hover:text-violet-500' }`}><BarChart2 size={14} /> 貢獻榜</button>
            <button onClick={() => handleLobbyTabChange('log')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${lobbyTab === 'log' ? (theme === 'dark' ? 'bg-slate-700 shadow-sm text-rose-400' : 'bg-white shadow-sm text-rose-600') : 'text-slate-500 hover:text-rose-500' }`}><History size={14} /> 日誌</button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col relative">
             {lobbyTab === 'chat' && (
                <>
                  <div className={`p-4 border-b flex items-center -mt-2 mb-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex -space-x-2 overflow-hidden py-1 px-1">
                      {onlineMembers.length > 0 ? (
                         onlineMembers.map((username, i) => {
                           const m = teamMembers.find(tm => tm.username === username);
                           return (
                             <div key={i} className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-slate-900 bg-slate-800' : 'border-white bg-slate-200'} flex items-center justify-center text-xs font-bold overflow-hidden`} title={`${username} (在線)`}>
                               {m?.avatar ? <img src={getAvatarUrl(m.avatar) || ''} alt={username} className="w-full h-full object-cover" /> : username[0].toUpperCase()}
                               <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                             </div>
                           );
                         })
                      ) : <span className="text-xs text-slate-400">無成員在線</span>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                    {hasMoreMsgs && (<div className="text-center py-2"><button onClick={() => fetchMessages(true)} disabled={isLoadingMore} className="text-xs text-slate-400 hover:text-primary-500">{isLoadingMore ? '載入中...' : '載入更多歷史訊息'}</button></div>)}
                    {messages.map((msg, idx) => {
                      const isMe = msg.sender === user;
                      const showTime = idx === 0 || new Date(msg.timestamp).getTime() - new Date(messages[idx - 1].timestamp).getTime() > 5 * 60 * 1000;
                      return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {showTime && <div className="text-[10px] text-slate-400 mb-1 text-center w-full">{formatMsgTime(msg.timestamp)}</div>}
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : (theme === 'dark' ? 'bg-slate-800 text-slate-200 rounded-tl-sm' : 'bg-white text-slate-700 rounded-tl-sm')}`}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', msg.content); }}
                          >
                            {!isMe && <div className="text-[10px] opacity-70 mb-1 font-bold">{msg.sender}</div>}
                            {msg.content}
                          </div>
                          {isMe && msg.id && (
                             <div className="flex items-center gap-0.5 mt-1 mr-1">
                               {readStatuses.filter(s => s.last_read_message_id >= (msg.id as number) && s.username !== user).map(s => (
                                 <div key={s.username} className="w-3 h-3 rounded-full overflow-hidden border border-white dark:border-slate-900" title={`${s.username} 已讀`}>
                                   {s.avatar ? <img src={getAvatarUrl(s.avatar) || ''} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-300 flex items-center justify-center text-[6px]">{s.username[0]}</div>}
                                 </div>
                               ))}
                             </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={scrollRef} />
                  </div>
                  <form onSubmit={sendTeamMessage} className={`p-3 border-t flex gap-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="輸入訊息..." className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all ${theme === 'dark' ? 'bg-slate-900 text-white placeholder-slate-500' : 'bg-slate-50 text-slate-900 placeholder-slate-400'}`} />
                    <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Send size={18} /></button>
                  </form>
                </>
             )}

             {lobbyTab === 'stats' && (
                <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                   {teamStats?.contributions?.sort((a, b) => b.total - a.total).map((c, i) => (
                      <div key={c.username} className={`flex items-center justify-between p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                         <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</div>
                            <span className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{c.username}</span>
                         </div>
                         <div className="text-right">
                            <div className="text-sm font-black text-primary-500">{c.total} <span className="text-[10px] text-slate-400">分</span></div>
                            <div className="text-[10px] text-slate-400">主 {c.main} / 副 {c.sub}</div>
                         </div>
                      </div>
                   ))}
                </div>
             )}

             {lobbyTab === 'log' && (
                <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                   {teamStats?.logs?.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm">
                         <div className={`mt-1 min-w-[6px] h-1.5 rounded-full ${log.action === 'checked' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                         <div>
                            <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                               <span className="font-bold">{log.user_name}</span> {log.action === 'checked' ? '完成了' : '取消了'} <span className="font-bold underline decoration-slate-300 underline-offset-2">{log.task_title}</span>
                            </p>
                            <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>
      </Panel>

    </Group>);
};

export default TeamWorkspace;