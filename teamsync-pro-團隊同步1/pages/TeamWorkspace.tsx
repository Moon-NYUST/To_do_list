import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Group, Panel, Separator } from "react-resizable-panels";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api, { API_BASE_URL, WS_BASE_URL } from '../services/api';
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

// --- 新組件匯入 ---
import ConfirmModal from '../components/ConfirmModal';
import TeamHeader from '../components/TeamHeader';
import TeamLobby from '../components/TeamLobby';
import TaskListItem from '../components/TaskListItem';
import InviteModal from '../components/team/InviteModal';
import CreateTaskModal from '../components/team/CreateTaskModal';
import EditTaskModal from '../components/team/EditTaskModal';

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
  const currentUsername = useMemo(() => {
    return typeof user === 'string' ? user : (user as any)?.username || '';
  }, [user]);
  const [searchParams] = useSearchParams();
  const activeTeam = searchParams.get('team');
  const queryClient = useQueryClient();

  const getAvatarUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
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

  const userAvatarMap = useMemo(() => {
    const map: Record<string, string> = {};
    // 注意：這裡是用 teamMembers (你上面 1. 取得的成員列表)
    teamMembers.forEach((m: any) => {
      if (m.username && m.avatar) {
        map[m.username] = m.avatar;
      }
    });
    return map;
  }, [teamMembers]);

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
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger' as 'danger' | 'info'
  });

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

  // --- Helper: 格式化時間 ---
  const formatMsgTime = (isoTime: string) => {
    if (!isoTime) return '';
    try {
      let adjusted = isoTime;
      if (adjusted && !adjusted.includes('Z') && !adjusted.includes('+')) {
        adjusted += 'Z';
      }
      return new Date(adjusted).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
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
  }, [tasks, currentUsername]);

  // --- Helper: 取得正確的 WebSocket URL ---
  const getWebSocketUrl = (endpoint: string, params: string) => {
    // 移除 WS_BASE_URL 末端的 /ws 如果 endpoint 已經包含斜線，或者進行正確拼接
    const base = WS_BASE_URL.endsWith('/') ? WS_BASE_URL.slice(0, -1) : WS_BASE_URL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${cleanEndpoint}${params}`;
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
        if (subtaskCompletedBy && subtaskCompletedBy !== currentUsername) {
          toast.error(`只有完成者 ${subtaskCompletedBy} 可以恢復此子任務`);
          return;
        }
      }

      const newStatus = !currentStatus;
      const completedBy = newStatus ? currentUsername : null;

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

  const handleDropToSubtask = async (taskId: string, content: string) => {
    if (!content) return;
    try {
      await api.post('/subtasks/', {
        task_id: taskId,
        title: content.length > 20 ? content.slice(0, 20) + '...' : content,
        is_completed: false
      });
      toast.success("訊息已轉為子任務");
      // 呼叫現有的 fetchSubtasks 以更新該任務的子任務緩存
      fetchSubtasks(taskId);
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      refetchTeamStats();
    } catch (err) {
      toast.error('無法將訊息轉換為子任務');
    }
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
      await api.patch(`/subtasks/${id}`, { is_completed: !currentStatus });
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
    if (!activeTeam || !currentUsername || lastMsgId <= lastReadIdRef.current) return;
    try {
      lastReadIdRef.current = lastMsgId; // 預先更新避免重複發送
      await api.post(`/ws/read/${activeTeam}?username=${currentUsername}&last_message_id=${lastMsgId}`);
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

      const wsUrl = getWebSocketUrl(`/ws/${activeTeam}`, `?username=${currentUsername}`);

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
      if (!currentTask.assigned_to.includes(currentUsername || '')) return;

      fetchTaskMessages(currentTask.id);

      const wsUrl = getWebSocketUrl(`/ws/${currentTask.id}`, `?username=${currentUsername}`);

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
        let due_adjusted = task.due_time || '';
        if (due_adjusted && !due_adjusted.includes('Z') && !due_adjusted.includes('+')) {
          due_adjusted += 'Z';
        }
        setFormData({
          id: task.id,
          title: task.title,
          description: task.description || '',
          due_time: due_adjusted ? format(new Date(due_adjusted), "yyyy-MM-dd'T'HH:mm") : '',
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
        due_time: formData.due_time ? new Date(formData.due_time).toISOString() : null,
        team: activeTeam,
        assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : [currentUsername]
      });
      // Invalidate to trigger update across clients (and locally)
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowCreateModal(false);
      resetForm();
    } catch (err) { toast.error('創建任務失敗'); } finally { setIsSubmitting(false); }
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
        is_completed: isCompleted,
        completed_by: isCompleted ? currentUsername : null
      });
      // 成功後 Invalidate 確保資料一致 (雖然已經樂觀更新了)
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      toast.error('更新狀態失敗');
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
        due_time: formData.due_time ? new Date(formData.due_time).toISOString() : null,
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
      if (!task.assigned_to.includes(currentUsername || '')) {
        toast.error("您沒有權限完成此任務");
        return;
      }

      // 權限鎖定邏輯
      if (task.is_completed) {
        // 嘗試取消完成
        if (task.completed_by && task.completed_by !== currentUsername) {
          toast.error(`只有完成者 ${task.completed_by} 可以恢復此任務進度`);
          return;
        }
      }

      const newIsCompleted = !task.is_completed;
      const completedBy = newIsCompleted ? currentUsername : null;

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

  const handleDeleteTask = (task: TeamTask) => {
    if (!task.assigned_to.includes(currentUsername || '')) {
      toast.error("您沒有權限刪除此任務");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: '確定刪除任務？',
      message: `您確定要刪除「${task.title}」嗎？此操作無法還原。`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/tasks/team/${task.id}`);
          toast.success("任務已刪除");
          queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          toast.error('刪除失敗');
        }
      }
    });
  };

  const handleDeleteTaskById = async (taskId: string) => {
    // 1. 權限檢查：必須是負責人才能刪除
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.assigned_to.includes(currentUsername || '')) {
      toast.error("您沒有權限刪除此任務");
      return;
    }

    // 看板拖曳刪除目前不強制確認，但也可以加
    try {
      queryClient.setQueryData<TeamTask[]>(['teamTasks', activeTeam], (old) => {
        return old ? old.filter(t => t.id !== taskId) : [];
      });

      await api.delete(`/tasks/team/${taskId}`);
      toast.success("任務已刪除");
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      toast.error('刪除失敗');
      refetchTasks();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !inviteUsername) return;
    setIsSubmitting(true);
    try {
      await api.post(`/teams/${encodeURIComponent(activeTeam)}/members`, { username: inviteUsername });
      toast.success(`成功邀請 ${inviteUsername} 加入團隊！`);
      fetchTeamMembers();
      setShowInviteModal(false);
      setInviteUsername('');
    } catch (err: any) { toast.error(err.response?.data?.detail || '邀請失敗'); } finally { setIsSubmitting(false); }
  };

  const openEditModal = (task: TeamTask) => {
    setCurrentTask(task);
    setFormData({
      id: task.id,
      title: task.title,
      description: task.description || '',
      due_time: task.due_time ? format(new Date(task.due_time), "yyyy-MM-dd'T'HH:mm") : '',
      assigned_to: Array.isArray(task.assigned_to) ? task.assigned_to : []
    });
    setActiveTab('details');
    fetchSubtasks(task.id);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ id: '', title: '', description: '', due_time: '', assigned_to: [currentUsername || ''] });
    setCurrentTask(null);
  };

  const hasPermission = (task: TeamTask) => Array.isArray(task.assigned_to) && task.assigned_to.includes(currentUsername || '');


  if (!activeTeam) return <div>請選擇團隊</div>;

  return (
    <Group direction="horizontal" className="h-[calc(100vh-8rem)]">

      {/* --- 左側：任務看板區 --- */}
      {/* 修改 1: defaultSize 改為 70，讓任務區預設稍微變窄，給右側更多空間 */}
      <Panel defaultSize={67.839} minSize={50} className="pr-2">
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* ... 左側內容保持不變 ... */}
          {/* (省略內部程式碼以節省空間，請保留你原本的內容) */}
          <TeamHeader
            activeTeam={activeTeam}
            teamMembersCount={teamMembers.length}
            viewMode={viewMode}
            setViewMode={setViewMode}
            theme={theme}
            onInvite={() => setShowInviteModal(true)}
            onCreateTask={() => { resetForm(); setShowCreateModal(true); }}
          />

          {/* 看板內容區 */}
          <div
            className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const content = e.dataTransfer.getData('text/plain');
              if (!content) return;
              try {
                await api.post(`/tasks/team/`, {
                  title: content.length > 20 ? content.slice(0, 20) + '...' : content,
                  description: content,
                  team: activeTeam,
                  status: 'todo',
                  assigned_to: [currentUsername]
                });
                toast.success("訊息已轉為任務");
                queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
              } catch (err) {
                toast.error('無法將訊息轉換為任務');
              }
            }}
          >
            {viewMode === 'list' ? (
              <div className="space-y-8">
                {/* ... List View Content (Paste your original List View code here) ... */}
                {/* 為節省顯示空間，此處省略，請保留原有的 List View 代碼 */}
                {[
                  { id: 'todo', label: '待處理', color: 'bg-slate-500' },
                  { id: 'in_progress', label: '進行中', color: 'bg-primary-500' },
                  { id: 'done', label: '已完成', color: 'bg-emerald-500' }
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
                        {sectionTasks.map((task) => (
                          <TaskListItem
                            key={task.id}
                            task={task}
                            theme={theme}
                            onToggleSubtasks={toggleSubtasks}
                            onToggleComplete={toggleComplete}
                            onOpenEdit={openEditModal}
                            onDelete={handleDeleteTask}
                            onPoppedOutChat={(id) => setPoppedOutChats(prev => new Set(prev).add(id))}
                            isExpanded={expandedTasks.has(task.id)}
                            subtasks={tasksSubtasks[task.id]}
                            isAssigned={hasPermission(task)}
                            teamMembers={teamMembers}
                            getAvatarUrl={getAvatarUrl}
                            onToggleSubTaskItem={handleToggleSubTaskInList}
                            onDropToSubtask={handleDropToSubtask}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === 'kanban' ? (
              <KanbanBoard
                tasks={sortedTasks}
                userMap={userAvatarMap}
                onUpdateStatus={handleUpdateTaskStatus}
                onEditTask={openEditModal}
                onToggleComplete={toggleComplete}
                onDeleteTask={handleDeleteTaskById}
                tasksSubtasks={tasksSubtasks}
                currentUsername={currentUsername}
                onDropToSubtask={handleDropToSubtask}
              />
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
      {/* 修改 2: defaultSize=30, minSize=25, 移除 maxSize (允許使用者自由拖曳) */}
      {/* --- 右側：團隊大廳 --- */}
      <Panel defaultSize={32.161} minSize={25} collapsible={true}>
        <TeamLobby
          lobbyTab={lobbyTab}
          onTabChange={handleLobbyTabChange}
          messages={messages}
          teamMembers={teamMembers}
          onlineMembers={onlineMembers}
          user={currentUsername}
          theme={theme}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={sendTeamMessage}
          teamStats={teamStats}
          isTeamWsReady={isTeamWsReady}
          hasMoreMsgs={hasMoreMsgs}
          isLoadingMore={isLoadingMore}
          onFetchMore={() => fetchMessages(true)}
          readStatuses={readStatuses}
          getAvatarUrl={getAvatarUrl}
          formatMsgTime={formatMsgTime}
        />
      </Panel>

      {/* --- Modals --- */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        inviteUsername={inviteUsername}
        setInviteUsername={setInviteUsername}
        isSubmitting={isSubmitting}
        theme={theme}
      />

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
        formData={formData}
        setFormData={setFormData}
        teamMembers={teamMembers}
        onAssignToggle={handleAssignToggle}
        isSubmitting={isSubmitting}
        theme={theme}
        getAvatarUrl={getAvatarUrl}
      />

      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentTask={currentTask}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        formData={formData}
        setFormData={setFormData}
        teamMembers={teamMembers}
        onAssignToggle={handleAssignToggle}
        onUpdateTask={handleUpdateTask}
        isSubmitting={isSubmitting}
        subtasks={subtasks}
        newSubTaskTitle={newSubTaskTitle}
        setNewSubTaskTitle={setNewSubTaskTitle}
        onAddSubTask={handleAddSubTask}
        onToggleSubTask={handleToggleSubTask}
        onDeleteSubTask={handleDeleteSubTask}
        taskMessages={taskMessages}
        newTaskMessage={newTaskMessage}
        setNewTaskMessage={setNewTaskMessage}
        onSendTaskMessage={sendTaskMessage}
        user={currentUsername}
        theme={theme}
        getAvatarUrl={getAvatarUrl}
        formatMsgTime={formatMsgTime}
        userAvatarMap={userAvatarMap}
        tasksSubtasks={tasksSubtasks}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
      />

      {/* --- 獨立聊天室 --- */}
      {Array.from(poppedOutChats).map(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return null;
        return (
          <DraggableChat
            key={taskId}
            taskId={taskId}
            taskTitle={task.title}
            onClose={() => setPoppedOutChats(prev => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            })}
            members={teamMembers}
          />
        );
      })}

    </Group >);
};

export default TeamWorkspace;