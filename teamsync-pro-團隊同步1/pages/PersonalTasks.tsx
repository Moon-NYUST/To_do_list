import React, { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';

interface PersonalTask {
  id: string;
  title: string;
  description?: string;
  due_time?: string;
  is_completed: boolean;
  created_at: string;
}

const PersonalTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ 
    id: '', 
    title: '', 
    description: '', 
    due_time: '', 
    tags: '' 
  });
  
  const [targetTeamName, setTargetTeamName] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/tasks/personal/${user}`);
      setTasks(res.data);
    } catch (err) {
      console.error("無法獲取個人任務", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const resetForm = () => {
    setFormData({ id: '', title: '', description: '', due_time: '', tags: '' });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/tasks/personal/`, {
        title: formData.title,
        description: formData.description,
        due_time: formData.due_time || null
      });
      await fetchTasks();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      alert('新增失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/tasks/personal/${formData.id}`, {
        title: formData.title,
        description: formData.description,
        due_time: formData.due_time || null
      });
      await fetchTasks();
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      alert('更新失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("確定要刪除此任務嗎？")) return;
    try {
      await api.delete(`/tasks/personal/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const toggleComplete = async (task: PersonalTask) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    try {
      await api.put(`/tasks/personal/${task.id}`, {
        is_completed: !task.is_completed
      });
    } catch (err) {
      alert('操作失敗');
      fetchTasks(); 
    }
  };

  const handlePromote = async () => {
    if (!promoteId || !targetTeamName) return;
    try {
      await api.post(`/tasks/personal/${promoteId}/promote?team_name=${encodeURIComponent(targetTeamName)}`);
      setTasks(prev => prev.filter(t => t.id !== promoteId));
      setPromoteId(null);
      setTargetTeamName('');
      alert(`任務已成功移轉至團隊：${targetTeamName}`);
    } catch (err) {
      alert('升級失敗，請確認團隊名稱是否存在');
    }
  };

  const openEditModal = (task: PersonalTask) => {
    setFormData({
      id: task.id,
      title: task.title,
      description: task.description || '',
      due_time: task.due_time ? new Date(task.due_time).toISOString().slice(0, 16) : '',
      tags: ''
    });
    setShowEditModal(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            My Tasks
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">PERSONAL</span>
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">管理您的私人待辦事項</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-200 transition-all"
        >
          <Plus size={18} />
          新增任務
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-10 custom-scrollbar pr-2">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={`group bg-white p-6 rounded-2xl border transition-all ${
              task.is_completed ? 'border-green-200 bg-green-50/30' : 'border-slate-100 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <button 
                  onClick={() => toggleComplete(task)}
                  className={`mt-1 transition-colors ${task.is_completed ? 'text-green-500' : 'text-slate-300 hover:text-indigo-600'}`}
                >
                  {task.is_completed ? <CheckCircle size={24} className="fill-green-100" /> : <Circle size={24} />}
                </button>
                
                <div className="space-y-1 flex-1">
                  <h3 
                    className={`font-bold text-lg leading-tight cursor-pointer hover:text-indigo-600 transition-colors ${
                      task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'
                    }`}
                    onClick={() => openEditModal(task)}
                  >
                    {task.title}
                  </h3>
                  <p className={`text-sm ${task.is_completed ? 'text-slate-300' : 'text-slate-500'} line-clamp-2`}>
                    {task.description || '無描述'}
                  </p>
                  
                  <div className="flex items-center gap-4 pt-2">
                    {task.due_time && (
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${
                        new Date(task.due_time) < new Date() && !task.is_completed ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        <Calendar size={14} />
                        {new Date(task.due_time).toLocaleDateString()} {new Date(task.due_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Clock size={14} />
                        建立於 {new Date(task.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 ml-4">
                {!task.is_completed && (
                  <button
                    onClick={() => setPromoteId(task.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ArrowUpCircle size={14} />
                    升級為團隊任務
                  </button>
                )}
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(task)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="編輯"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="刪除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">新增個人任務</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">任務標題</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all font-medium"
                />
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">截止時間 (選填)</label>
                  <input
                    type="datetime-local"
                    value={formData.due_time}
                    onChange={(e) => setFormData({...formData, due_time: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-medium text-slate-600"
                  />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">詳細描述</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">取消</button>
                <button type="submit" disabled={isSubmitting || !formData.title} className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50">確認新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">編輯任務</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateTask} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">任務標題</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all font-medium"
                />
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">截止時間</label>
                  <input
                    type="datetime-local"
                    value={formData.due_time}
                    onChange={(e) => setFormData({...formData, due_time: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-medium text-slate-600"
                  />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">詳細描述</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">取消</button>
                <button type="submit" disabled={isSubmitting || !formData.title} className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50">儲存變更</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {promoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">升級為團隊任務</h3>
              <button onClick={() => setPromoteId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-slate-500 text-sm font-medium">
                這將會把此任務從您的個人列表中移除，並轉移到指定的團隊工作區。
              </p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">目標團隊名稱</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="例如：技術開發部"
                  value={targetTeamName}
                  onChange={(e) => setTargetTeamName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all font-medium"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setPromoteId(null)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                >
                  取消
                </button>
                <button 
                  onClick={handlePromote}
                  disabled={!targetTeamName}
                  className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none"
                >
                  確認移轉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalTasks;