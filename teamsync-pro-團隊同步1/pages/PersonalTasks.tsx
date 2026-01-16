import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Trash2,
  ArrowUpCircle,
  Calendar,
  CheckCircle,
  Circle,
  Tag,
  Edit2,
  X,
  Layout,
  Clock,
  Trello,
  List as ListIcon,
  Wifi,
  Calendar as CalendarIcon,
  ListChecks,
  PlusSquare,
  Check,
  MessageSquare,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import KanbanBoard from '../components/KanbanBoard';
import CalendarView from '../components/CalendarView';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface PersonalTask {
  id: string;
  title: string;
  description?: string;
  due_time?: string;
  is_completed: boolean;
  created_at: string;
  status?: string;
}

interface SubTask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

const PersonalTasks: React.FC = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // --- 使用者身分標準化 ---
  const currentUsername = useMemo(() => {
    return typeof user === 'string' ? user : (user as any)?.username || '';
  }, [user]);

  // --- 刪除確認彈窗狀態 ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    due_time: '',
    tags: ''
  });

  const [activeTab, setActiveTab] = useState<'details' | 'subtasks'>('details');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  const [targetTeamName, setTargetTeamName] = useState('');
  const [myTeams, setMyTeams] = useState<any[]>([]);

  // --- 列表擴展狀態 ---
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [tasksSubtasks, setTasksSubtasks] = useState<Record<string, SubTask[]>>({});

  // 1. 取得個人任務 (React Query)
  const { data: tasks = [], refetch: refetchTasks } = useQuery<PersonalTask[]>({
    queryKey: ['personalTasks', currentUsername],
    queryFn: async () => {
      const res = await api.get(`/tasks/personal/${currentUsername}`);
      return res.data;
    },
    enabled: !!currentUsername
  });

  useEffect(() => {
    const fetchMyTeams = async () => {
      try {
        const res = await api.get('/teams/');
        setMyTeams(res.data);
      } catch (err) {
        console.error("Fetch Teams error:", err);
      }
    };
    if (user) fetchMyTeams();
  }, [user]);

  const toggleSubtasks = async (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
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
      await api.patch(`/subtasks/${subtaskId}`, {
        is_completed: !currentStatus
      });
      setTasksSubtasks(prev => ({
        ...prev,
        [taskId]: prev[taskId].map(st => st.id === subtaskId ? { ...st, is_completed: !currentStatus } : st)
      }));
    } catch (err) {
      toast.error('更新子任務失敗');
    }
  };

  const resetForm = () => {
    setFormData({ id: '', title: '', description: '', due_time: '', tags: '' });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/tasks/personal/`, {
        title: formData.title,
        description: formData.description,
        due_time: formData.due_time ? new Date(formData.due_time).toISOString() : null
      });
      queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowCreateModal(false);
      resetForm();
      toast.success('任務已新增');
    } catch (err) {
      toast.error('新增失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.title.trim()) return;
    setIsSubmitting(true);
    try {
      await api.put(`/tasks/personal/${formData.id}`, {
        title: formData.title,
        description: formData.description,
        due_time: formData.due_time ? new Date(formData.due_time).toISOString() : null
      });
      queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowEditModal(false);
      resetForm();
      toast.success('任務已更新');
    } catch (err) {
      toast.error('更新失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.delete(`/tasks/personal/${taskId}`);
      queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success('任務已刪除');
    } catch (err) {
      toast.error('刪除失敗');
    }
  };

  const toggleComplete = async (task: PersonalTask) => {
    try {
      const newIsCompleted = !task.is_completed;
      await api.put(`/tasks/personal/${task.id}`, {
        is_completed: newIsCompleted,
        completed_by: newIsCompleted ? currentUsername : null
      });
      queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      toast.error('更新狀態失敗');
    }
  };

  const handlePromote = async () => {
    if (!promoteId || !targetTeamName) return;
    try {
      await api.post(`/tasks/personal/${promoteId}/promote?team_name=${encodeURIComponent(targetTeamName)}`);
      queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setPromoteId(null);
      setTargetTeamName('');
      toast.success(`任務已成功移轉至團隊：${targetTeamName}`);
    } catch (err) {
      toast.error('升級失敗，請確認團隊名稱是否存在');
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
    if (!newSubTaskTitle.trim() || !formData.id) return;
    try {
      const res = await api.post('/subtasks/', {
        task_id: formData.id,
        title: newSubTaskTitle.trim(),
        is_completed: false
      });
      setSubtasks(prev => [...prev, res.data]);
      setNewSubTaskTitle('');
      toast.success('子任務已新增');
    } catch (err) {
      toast.error('新增子任務失敗');
    }
  };

  const handleToggleSubTask = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/subtasks/${id}?is_completed=${!currentStatus}`);
      setSubtasks(prev => prev.map(st => st.id === id ? { ...st, is_completed: !currentStatus } : st));
    } catch (err) {
      toast.error('更新子任務失敗');
    }
  };

  const handleDeleteSubTask = async (id: string) => {
    try {
      await api.delete(`/subtasks/${id}`);
      setSubtasks(prev => prev.filter(st => st.id !== id));
      toast.success('子任務已刪除');
    } catch (err) {
      toast.error('刪除子任務失敗');
    }
  };

  const openEditModal = (task: PersonalTask) => {
    let due_adjusted = task.due_time || '';
    if (due_adjusted && !due_adjusted.includes('Z') && !due_adjusted.includes('+')) {
      due_adjusted += 'Z';
    }
    setFormData({
      id: task.id,
      title: task.title,
      description: task.description || '',
      due_time: due_adjusted ? format(new Date(due_adjusted), "yyyy-MM-dd'T'HH:mm") : '',
      tags: ''
    });
    setActiveTab('details');
    fetchSubtasks(task.id);
    setShowEditModal(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              My Tasks
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>PERSONAL</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm mt-1">管理您的私人待辦事項</p>
          </div>

          <div className={`flex items-center p-1 rounded-xl border self-start ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
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
              <Calendar size={14} /> 日曆
            </button>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all"
        >
          <Plus size={18} />
          新增任務
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar pr-2">
        {viewMode === 'list' ? (
          <div className="space-y-8">
            {[
              { id: 'todo', label: '待處理', icon: <Circle size={14} />, color: 'bg-slate-500' },
              { id: 'in_progress', label: '進行中', icon: <Wifi size={14} />, color: 'bg-primary-500' },
              { id: 'done', label: '已完成', icon: <CheckCircle size={14} />, color: 'bg-emerald-500' }
            ].map(section => {
              const sectionTasks = Array.isArray(tasks) ? tasks.filter(t => (section.id === 'done' ? t.is_completed : (!t.is_completed && ((t as any).status === section.id || (section.id === 'todo' && !(t as any).status))))) : [];
              if (sectionTasks.length === 0) return null;

              return (
                <div key={section.id} className="space-y-4">
                  <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                    <div className={`w-2 h-2 rounded-full ${section.color}`}></div>
                    {section.label} ({sectionTasks.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {sectionTasks.map((task) => (
                      <div
                        key={task.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const content = e.dataTransfer.getData('text/plain');
                          if (content) {
                            try {
                              await api.post('/subtasks/', {
                                task_id: task.id,
                                title: content,
                                is_completed: false
                              });
                              queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
                              // 如果已經展開，順便刷新該任務的子任務列表
                              if (expandedTasks.has(task.id)) {
                                const res = await api.get(`/subtasks/${task.id}`);
                                setTasksSubtasks(old => ({ ...old, [task.id]: res.data }));
                              }
                              toast.success('訊息已轉為子任務');
                            } catch (err) {
                              toast.error('建立子任務失敗');
                            }
                          }
                        }}
                        className={`group p-6 rounded-2xl border transition-all ${theme === 'dark'
                          ? (task.is_completed ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700')
                          : (task.is_completed ? 'border-green-200 bg-green-50/30' : 'bg-white border-slate-100 hover:shadow-md')
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="flex flex-col gap-2 mt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleSubtasks(task.id); }}
                                className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                              >
                                {expandedTasks.has(task.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </button>
                              <button
                                onClick={() => toggleComplete(task)}
                                className={`transition-colors ${task.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}
                              >
                                {task.is_completed ? <CheckCircle size={24} className={theme === 'dark' ? '' : 'fill-green-100'} /> : <Circle size={24} />}
                              </button>
                            </div>

                            <div className="space-y-1 flex-1">
                              <h3
                                className={`font-bold text-lg leading-tight cursor-pointer hover:text-primary-500 transition-colors ${task.is_completed ? (theme === 'dark' ? 'text-slate-600' : 'text-slate-400') + ' line-through' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-800')
                                  }`}
                                onClick={() => openEditModal(task)}
                              >
                                {task.title}
                              </h3>
                              <p className={`text-sm ${task.is_completed ? 'text-slate-300 dark:text-slate-700' : 'text-slate-500'} line-clamp-2`}>
                                {task.description || '無描述'}
                              </p>

                              <div className="flex items-center gap-4 pt-2">
                                {task.due_time && (
                                  <div className={`flex items-center gap-1.5 text-xs font-bold ${(() => {
                                    const dt = new Date(task.due_time.includes('Z') || task.due_time.includes('+') ? task.due_time : task.due_time + 'Z');
                                    return dt < new Date() && !task.is_completed;
                                  })() ? 'text-rose-500' : 'text-slate-400'
                                    }`}>
                                    <Calendar size={14} />
                                    {(() => {
                                      const dt = new Date(task.due_time.includes('Z') || task.due_time.includes('+') ? task.due_time : task.due_time + 'Z');
                                      return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
                                    })()}
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                  <Clock size={14} />
                                  建立於 {new Date(task.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3 ml-4">
                            {!task.is_completed && (
                              <button
                                onClick={() => setPromoteId(task.id)}
                                className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${theme === 'dark'
                                  ? 'text-primary-400 bg-primary-950/50 hover:bg-primary-900/50'
                                  : 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                                  }`}
                              >
                                <ArrowUpCircle size={14} />
                                升級為團隊任務
                              </button>
                            )}

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(task)}
                                className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-500 hover:text-primary-400 hover:bg-slate-800' : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50'
                                  }`}
                                title="編輯"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => { setTaskToDelete(task.id); setShowDeleteConfirm(true); }}
                                className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                title="刪除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {expandedTasks.has(task.id) && (
                          <div className="mt-4 ml-12 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4 animate-in slide-in-from-top-2 duration-200">
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
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={tasks.map(t => ({ ...t, status: (t as any).status || (t.is_completed ? 'done' : 'todo'), assigned_to: [currentUsername] }))}
            onUpdateStatus={async (taskId, newStatus) => {
              const queryKey = ['personalTasks', currentUsername];
              await queryClient.cancelQueries({ queryKey });
              const previousTasks = queryClient.getQueryData<PersonalTask[]>(queryKey);

              if (previousTasks) {
                queryClient.setQueryData<PersonalTask[]>(queryKey, (old) => {
                  if (!old) return [];
                  return old.map(t =>
                    t.id === taskId
                      ? { ...t, status: newStatus, is_completed: newStatus === 'done' }
                      : t
                  );
                });
              }

              try {
                await api.put(`/tasks/personal/${taskId}`, { status: newStatus, is_completed: newStatus === 'done' });
                toast.success('狀態已更新');
              } catch (err) {
                if (previousTasks) {
                  queryClient.setQueryData(queryKey, previousTasks);
                }
                toast.error('更新失敗');
              } finally {
                queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
              }
            }}
            onEditTask={openEditModal}
            onToggleComplete={toggleComplete}
            onDeleteTask={(taskId) => {
              setTaskToDelete(taskId);
              setShowDeleteConfirm(true);
            }}
            currentUsername={currentUsername}
            onDropToSubtask={async (taskId, content) => {
              try {
                await api.post('/subtasks/', {
                  task_id: taskId,
                  title: content,
                  is_completed: false
                });
                queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
                toast.success('訊息已轉為子任務');
              } catch (err) {
                toast.error('建立子任務失敗');
              }
            }}
          />
        ) : (
          <CalendarView
            tasks={tasks as any}
            user={currentUsername}
            onEditTask={openEditModal}
            onTaskUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['personalTasks', currentUsername] });
              queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            }}
          />
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className={`px-8 py-6 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>新增個人任務</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="p-8 space-y-5">
              <div>
                <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>任務標題</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500 focus:ring-4 focus:ring-primary-900/20' : 'bg-white border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50/50'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>截止時間 (選填)</label>
                <input
                  type="datetime-local"
                  value={formData.due_time}
                  onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border outline-none font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 focus:border-primary-500' : 'bg-white border-slate-200 text-slate-600 focus:border-primary-500'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>詳細描述</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border outline-none resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 focus:border-primary-500' : 'bg-white border-slate-200 text-slate-600 focus:border-primary-500'}`}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className={`flex-1 py-3.5 rounded-xl font-bold transition-colors ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>取消</button>
                <button type="submit" disabled={isSubmitting || !formData.title.trim()} className="flex-1 py-3.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-500/20">確認新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className={`px-8 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`text-sm font-bold pb-1 transition-all ${activeTab === 'details' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-400'}`}
                >
                  任務詳情
                </button>
                <button
                  onClick={() => setActiveTab('subtasks')}
                  className={`text-sm font-bold pb-1 transition-all flex items-center gap-1.5 ${activeTab === 'subtasks' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-400'}`}
                >
                  子任務 ({subtasks.length})
                </button>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {activeTab === 'details' ? (
                <form onSubmit={handleUpdateTask} className="space-y-5">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>任務標題</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500 focus:ring-4 focus:ring-primary-900/20' : 'bg-white border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50/50'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>截止時間</label>
                    <input
                      type="datetime-local"
                      value={formData.due_time}
                      onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border outline-none font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 focus:border-primary-500' : 'bg-white border-slate-200 text-slate-600 focus:border-primary-500'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>詳細描述</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border outline-none resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 focus:border-primary-500' : 'bg-white border-slate-200 text-slate-600 focus:border-primary-500'}`}
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowEditModal(false)} className={`flex-1 py-3.5 rounded-xl font-bold transition-colors ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>取消</button>
                    <button type="submit" disabled={isSubmitting || !formData.title.trim()} className="flex-1 py-3.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-500/20">儲存變更</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <form onSubmit={handleAddSubTask} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新增子任務..."
                      value={newSubTaskTitle}
                      onChange={e => setNewSubTaskTitle(e.target.value)}
                      className={`flex-1 px-4 py-3 rounded-xl border outline-none transition-all font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-white border-slate-200 focus:border-primary-500'}`}
                    />
                    <button type="submit" disabled={!newSubTaskTitle.trim()} className="p-3.5 bg-primary-600 text-white rounded-xl disabled:opacity-50 shadow-lg shadow-primary-500/20">
                      <PlusSquare size={20} />
                    </button>
                  </form>

                  <div className="space-y-3">
                    {subtasks.length === 0 ? (
                      <div className="text-center py-10">
                        <ListChecks size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400 text-sm italic">尚無子任務，快來建立一個吧！</p>
                      </div>
                    ) : (
                      subtasks.map(st => (
                        <div key={st.id} className={`flex items-center justify-between p-4 rounded-2xl border group transition-all ${theme === 'dark' ? (st.is_completed ? 'bg-emerald-900/10 border-emerald-900/20 opacity-60' : 'bg-slate-800 border-slate-700') : (st.is_completed ? 'bg-green-50 border-green-100 opacity-60' : 'bg-white border-slate-100 shadow-sm')}`}>
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleToggleSubTask(st.id, st.is_completed)} className={`transition-colors ${st.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}>
                              {st.is_completed ? <CheckCircle size={22} /> : <Circle size={22} />}
                            </button>
                            <span className={`font-bold ${st.is_completed ? 'line-through text-slate-400' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-700')}`}>{st.title}</span>
                          </div>
                          <button onClick={() => handleDeleteSubTask(st.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {promoteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                <ArrowUpCircle size={28} />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>升級為團隊任務</h3>
                <p className="text-slate-500 text-xs font-medium">將此任務移動至指定團隊</p>
              </div>
            </div>

            <div className="space-y-5">
              <p className={`text-[10px] font-bold leading-relaxed ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                這將會把此任務從您的個人列表中移除，並轉移到您選擇的團隊工作區中。
              </p>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">選擇目標團隊</label>
                <div className="relative">
                  <select
                    autoFocus
                    value={targetTeamName}
                    onChange={(e) => setTargetTeamName(e.target.value)}
                    className={`w-full px-5 py-4 rounded-2xl border outline-none font-bold transition-all appearance-none cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-primary-500'}`}
                  >
                    <option value="">選擇團隊...</option>
                    {myTeams.map(team => (
                      <option key={team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPromoteId(null)}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-colors ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  取消
                </button>
                <button
                  onClick={handlePromote}
                  disabled={!targetTeamName}
                  className="flex-1 py-4 rounded-2xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-xl shadow-primary-500/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                >
                  確認升級
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="刪除任務"
        message="確定要刪除此任務嗎？此動作無法復原。"
        confirmText="確認刪除"
        cancelText="取消"
        type="danger"
        onConfirm={() => {
          if (taskToDelete) {
            handleDeleteTask(taskToDelete);
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setTaskToDelete(null);
        }}
      />
    </div>
  );
};

export default PersonalTasks;