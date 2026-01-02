import React, { useRef, useEffect } from 'react';
import {
    X,
    CheckCircle,
    Activity,
    Edit2,
    ListChecks,
    MessageSquare,
    Circle,
    Trash2,
    Plus,
    Lock,
    Send
} from 'lucide-react';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTask: any;
    activeTab: 'details' | 'chat' | 'subtasks';
    setActiveTab: (tab: 'details' | 'chat' | 'subtasks') => void;
    formData: any;
    setFormData: (data: any) => void;
    teamMembers: any[];
    onAssignToggle: (username: string) => void;
    onUpdateTask: (e: React.FormEvent) => void;
    isSubmitting: boolean;
    subtasks: any[];
    newSubTaskTitle: string;
    setNewSubTaskTitle: (title: string) => void;
    onAddSubTask: (e: React.FormEvent) => void;
    onToggleSubTask: (id: string, currentStatus: boolean) => void;
    onDeleteSubTask: (id: string) => void;
    taskMessages: any[];
    newTaskMessage: string;
    setNewTaskMessage: (msg: string) => void;
    onSendTaskMessage: (e: React.FormEvent) => void;
    user: string | null;
    theme: 'light' | 'dark';
    getAvatarUrl: (url: string | null) => string | null;
    formatMsgTime: (iso: string) => string;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
    isOpen,
    onClose,
    currentTask,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    teamMembers,
    onAssignToggle,
    onUpdateTask,
    isSubmitting,
    subtasks,
    newSubTaskTitle,
    setNewSubTaskTitle,
    onAddSubTask,
    onToggleSubTask,
    onDeleteSubTask,
    taskMessages,
    newTaskMessage,
    setNewTaskMessage,
    onSendTaskMessage,
    user,
    theme,
    getAvatarUrl,
    formatMsgTime
}) => {
    const taskChatScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === 'chat') {
            taskChatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [taskMessages, activeTab]);

    if (!isOpen || !currentTask) return null;

    const isAssignedToMe = currentTask.assigned_to.includes(user || '');

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'
                }`}>
                <div className={`p-4 border-b flex items-center justify-between shrink-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${currentTask.is_completed ? 'bg-emerald-100 text-emerald-600' : 'bg-primary-100 text-primary-600'}`}>
                            {currentTask.is_completed ? <CheckCircle size={20} /> : <Activity size={20} />}
                        </div>
                        <div>
                            <h3 className={`font-bold text-lg leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                {currentTask.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {currentTask.id.slice(0, 8)}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Sidebar Tabs */}
                    <div className={`w-48 border-r p-2 flex flex-col gap-1 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'
                        }`}>
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${activeTab === 'details'
                                    ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Edit2 size={16} /> 詳細資訊
                        </button>
                        <button
                            onClick={() => setActiveTab('subtasks')}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${activeTab === 'subtasks'
                                    ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <ListChecks size={16} /> 子任務
                            <span className="ml-auto bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-md">
                                {subtasks.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${activeTab === 'chat'
                                    ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <MessageSquare size={16} /> 討論區
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-black/20">
                        {activeTab === 'details' && (
                            <form onSubmit={onUpdateTask} className="p-8 space-y-6 max-w-2xl mx-auto">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">標題</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500/50 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                                }`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">截止時間</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.due_time}
                                                onChange={e => setFormData({ ...formData, due_time: e.target.value })}
                                                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500/50 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                                    }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">指派給</label>
                                            <div className={`w-full px-3 py-2 rounded-xl border min-h-[50px] flex flex-wrap items-center gap-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                                }`}>
                                                {teamMembers.map(m => (
                                                    <button
                                                        key={m.username}
                                                        type="button"
                                                        onClick={() => onAssignToggle(m.username)}
                                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${formData.assigned_to.includes(m.username)
                                                                ? 'border-primary-500 scale-110 shadow-md'
                                                                : (theme === 'dark' ? 'border-slate-600 opacity-50 hover:opacity-100' : 'border-slate-200 opacity-50 hover:opacity-100')
                                                            }`}
                                                        title={m.username}
                                                    >
                                                        {m.avatar ? <img src={getAvatarUrl(m.avatar) || ''} alt={m.username} className="w-full h-full rounded-full object-cover" /> : <span className="text-[10px] font-bold">{m.username[0].toUpperCase()}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">描述</label>
                                        <textarea
                                            rows={6}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500/50 outline-none transition-all resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                                }`}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">取消</button>
                                    <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all font-bold">
                                        {isSubmitting ? '儲存中...' : '儲存變更'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'subtasks' && (
                            <div className="p-8 max-w-2xl mx-auto h-full flex flex-col">
                                <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                                    {subtasks.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <ListChecks size={48} className="mx-auto mb-3 opacity-20" />
                                            <p>尚無子任務</p>
                                        </div>
                                    ) : (
                                        subtasks.map(st => (
                                            <div key={st.id} className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${theme === 'dark' ? (st.is_completed ? 'bg-emerald-900/10 border-emerald-900/20 opacity-60' : 'bg-slate-800 border-slate-700') : (st.is_completed ? 'bg-green-50 border-green-100 opacity-60' : 'bg-white border-slate-100 shadow-sm')
                                                }`}>
                                                <button
                                                    onClick={() => onToggleSubTask(st.id, st.is_completed)}
                                                    className={`shrink-0 transition-colors ${st.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}
                                                >
                                                    {st.is_completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                                                </button>
                                                <span className={`flex-1 font-bold ${st.is_completed ? 'line-through text-slate-400' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-700')}`}>
                                                    {st.title}
                                                </span>
                                                <button
                                                    onClick={() => onDeleteSubTask(st.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <form onSubmit={onAddSubTask} className="mt-6 flex gap-2">
                                    <input
                                        type="text"
                                        value={newSubTaskTitle}
                                        onChange={e => setNewSubTaskTitle(e.target.value)}
                                        placeholder="新增子任務..."
                                        className={`flex-1 px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary-500/50 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                            }`}
                                    />
                                    <button type="submit" disabled={!newSubTaskTitle.trim()} className="px-6 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors font-bold"><Plus size={20} /></button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <div className="flex flex-col h-full">
                                {!isAssignedToMe ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                        <Lock size={48} className="mb-4 opacity-20" />
                                        <p>您不是此任務的負責人，無法查看討論內容</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                            {taskMessages.map((msg, i) => {
                                                const isMe = msg.sender === user;
                                                const mInfo = teamMembers.find(m => m.username === msg.sender);
                                                return (
                                                    <div key={i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        <div className="shrink-0 w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm">
                                                            {mInfo?.avatar ? <img src={getAvatarUrl(mInfo.avatar) || ''} className="w-full h-full object-cover" alt={msg.sender} /> : <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{msg.sender[0]}</div>}
                                                        </div>
                                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                                <span className="text-xs font-bold text-slate-500">{msg.sender}</span>
                                                                <span className="text-[10px] text-slate-400">{formatMsgTime(msg.timestamp)}</span>
                                                            </div>
                                                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : (theme === 'dark' ? 'bg-slate-800 text-slate-200 rounded-tl-sm' : 'bg-white text-slate-700 rounded-tl-sm')
                                                                }`}>
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={taskChatScrollRef} />
                                        </div>
                                        <form onSubmit={onSendTaskMessage} className={`p-4 border-t flex gap-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                                            }`}>
                                            <input
                                                type="text"
                                                value={newTaskMessage}
                                                onChange={e => setNewTaskMessage(e.target.value)}
                                                placeholder="輸入討論訊息..."
                                                className={`flex-1 px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary-500/50 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                                    }`}
                                            />
                                            <button type="submit" disabled={!newTaskMessage.trim()} className="px-6 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors font-bold"><Send size={20} /></button>
                                        </form>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditTaskModal;
