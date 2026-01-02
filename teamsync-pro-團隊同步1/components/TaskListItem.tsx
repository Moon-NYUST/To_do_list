import React from 'react';
import {
    Circle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    MessageSquare,
    Edit2,
    Trash2,
    Lock,
    Calendar,
    Users,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TaskListItemProps {
    task: any;
    theme: 'light' | 'dark';
    onToggleSubtasks: (id: string) => void;
    onToggleComplete: (task: any) => void;
    onOpenEdit: (task: any) => void;
    onDelete: (task: any) => void;
    onPoppedOutChat: (id: string) => void;
    isExpanded: boolean;
    subtasks: any[];
    isAssigned: boolean;
    teamMembers: any[];
    getAvatarUrl: (url: string | null) => string | null;
    onToggleSubTaskItem: (taskId: string, subtaskId: string, currentStatus: boolean, completedBy?: string | null) => void;
}

const TaskListItem: React.FC<TaskListItemProps> = ({
    task,
    theme,
    onToggleSubtasks,
    onToggleComplete,
    onOpenEdit,
    onDelete,
    onPoppedOutChat,
    isExpanded,
    subtasks,
    isAssigned,
    teamMembers,
    getAvatarUrl,
    onToggleSubTaskItem
}) => {
    return (
        <div key={task.id} className={`group p-5 rounded-2xl border transition-all ${theme === 'dark'
            ? (task.is_completed ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700')
            : (task.is_completed ? 'border-green-200 bg-green-50/30' : 'bg-white border-slate-100 hover:shadow-md')
            }`}
            onClick={() => {
                if (isAssigned) {
                    onOpenEdit(task);
                } else {
                    toast.error("無權編輯此任務");
                }
            }}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSubtasks(task.id); }}
                        className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                    >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isAssigned) {
                                onToggleComplete(task);
                            } else {
                                toast.error("無權修改任務狀態");
                            }
                        }}
                        className={`transition-colors ${task.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'} ${!isAssigned ? 'cursor-not-allowed' : ''}`}
                    >
                        {task.is_completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                    </button>
                    <h3 className={`font-bold text-lg cursor-pointer hover:text-primary-500 transition-colors ${task.is_completed
                        ? (theme === 'dark' ? 'text-slate-600' : 'text-slate-400') + ' line-through'
                        : (theme === 'dark' ? 'text-slate-200' : 'text-slate-800')
                        }`}>
                        {task.title}
                    </h3>
                </div>

                {isAssigned ? (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onPoppedOutChat(task.id); }}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800'
                                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                            title="開啟討論"
                        >
                            <MessageSquare size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenEdit(task); }}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                ? 'text-slate-500 hover:text-primary-400 hover:bg-slate-800'
                                : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50'
                                }`}
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                        <Lock size={12} />
                        <span>無權編輯</span>
                    </div>
                )}
            </div>

            <div className="pl-9 flex items-center gap-4 text-xs font-bold text-slate-500">
                {task.due_time && (
                    <div className={`flex items-center gap-1.5 ${new Date(task.due_time) < new Date() && !task.is_completed ? 'text-rose-500' : ''
                        }`}>
                        <Calendar size={14} /> {new Date(task.due_time).toLocaleDateString()}
                    </div>
                )}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${theme === 'dark' ? 'text-primary-400 bg-primary-950/50' : 'text-primary-600 bg-primary-50'
                    }`}>
                    <Users size={14} /> {(task.assigned_to || []).length} 人負責
                </div>
                <div className="flex -space-x-2">
                    {Array.isArray(task.assigned_to) && task.assigned_to.slice(0, 3).map(u => {
                        const mInfo = teamMembers.find(m => m.username === u);
                        return (
                            <div
                                key={u}
                                className={`w-5 h-5 rounded-full border border-2 overflow-hidden flex items-center justify-center text-[8px] font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-900 text-slate-400' : 'bg-slate-200 border-white text-slate-600'
                                    }`}
                                title={u}
                            >
                                {mInfo?.avatar ? (
                                    <img src={getAvatarUrl(mInfo.avatar) || ''} alt={u} className="w-full h-full object-cover" />
                                ) : (u ? u[0].toUpperCase() : '?')}
                            </div>
                        );
                    })}
                    {(task.assigned_to || []).length > 3 && <span className="text-[10px] pl-3">+{(task.assigned_to || []).length - 3}</span>}
                </div>
            </div>

            {
                isExpanded && (
                    <div className="mt-4 ml-9 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                        {task.is_completed && task.completed_by && (
                            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 w-fit text-[10px]">
                                <Check size={12} /><span className="font-bold">由 {task.completed_by} 完成</span>
                            </div>
                        )}
                        {!subtasks ? (
                            <div className="text-[10px] text-slate-400 animate-pulse">載入中...</div>
                        ) : subtasks.length === 0 ? (
                            <div className="text-[10px] text-slate-400 italic">無子任務</div>
                        ) : (
                            subtasks.map(st => (
                                <div key={st.id} className="flex items-start gap-2 group/st flex-col sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleSubTaskItem(task.id, st.id, st.is_completed, st.completed_by) }}
                                            className={`transition-colors ${st.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}
                                        >
                                            {st.is_completed ? <CheckCircle size={14} /> : <Circle size={14} />}
                                        </button>
                                        <span className={`text-xs font-medium ${st.is_completed ? 'line-through text-slate-400' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}`}>
                                            {st.title}
                                        </span>
                                    </div>
                                    {st.is_completed && st.completed_by && (
                                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-6 sm:ml-0">{st.completed_by} 完成</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default TaskListItem;
