import React, { useState } from 'react';
import { X, Clock, CheckCircle2, Circle, Search, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Task {
    id: string;
    title: string;
    team?: string;
}

interface WorkPlanModalProps {
    onClose: () => void;
    onConfirm: (plannedHours: number, selectedTasks: Task[]) => void;
    isLoading?: boolean;
}

const WorkPlanModal: React.FC<WorkPlanModalProps> = ({ onClose, onConfirm, isLoading }) => {
    const { theme } = useTheme();
    const [plannedHours, setPlannedHours] = useState(2);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: tasksData, isLoading: isTasksLoading } = useQuery({
        queryKey: ['pendingTasksForPlan'],
        queryFn: async () => {
            const res = await api.get('/stats/tasks/pending');
            const personal = res.data.personal || [];
            const team = (res.data.team || []).map((t: any) => ({ ...t, isTeam: true }));
            return [...personal, ...team] as Task[];
        }
    });

    const filteredTasks = tasksData?.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const toggleTask = (taskId: string) => {
        if (selectedTaskIds.includes(taskId)) {
            setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
        } else if (selectedTaskIds.length < 3) {
            setSelectedTaskIds(prev => [...prev, taskId]);
        }
    };

    const selectedTasks = tasksData?.filter(t => selectedTaskIds.includes(t.id)) || [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>今日工作計畫</h2>
                        <p className="text-slate-500 text-sm font-medium mt-1">選出今天最重要的 3 件事，並設定目標工時</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* 時間設定 */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14} className="text-primary-500" /> 設定工時
                            </h3>
                            <span className="text-2xl font-black text-primary-600">{plannedHours} <span className="text-sm">小時</span></span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="8"
                            step="0.5"
                            value={plannedHours}
                            onChange={(e) => setPlannedHours(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            <span>0.5h</span>
                            <span>2h</span>
                            <span>4h</span>
                            <span>6h</span>
                            <span>8h</span>
                        </div>
                    </section>

                    {/* 任務選擇 */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-emerald-500" /> 挑選任務 ({selectedTaskIds.length}/3)
                            </h3>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="搜尋任務..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`pl-9 pr-4 py-2 text-xs rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-primary-500'}`}
                                />
                            </div>
                        </div>

                        {isTasksLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-4 text-slate-400">
                                <Loader2 className="animate-spin" size={32} />
                                <p className="text-sm font-bold">載入任務中...</p>
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 italic text-sm">
                                找不到相關的待辦事項
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredTasks.map(task => {
                                    const isSelected = selectedTaskIds.includes(task.id);
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleTask(task.id)}
                                            className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all ${isSelected
                                                    ? 'bg-primary-50 border-primary-500 dark:bg-primary-950/20'
                                                    : (theme === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-primary-200')
                                                }`}
                                        >
                                            <div className={isSelected ? 'text-primary-600' : 'text-slate-300'}>
                                                {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {task.team && (
                                                        <span className="text-[9px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded leading-none uppercase">
                                                            {task.team}
                                                        </span>
                                                    )}
                                                    <p className={`font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        {task.title}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <button
                        onClick={() => onConfirm(plannedHours, selectedTasks)}
                        disabled={isLoading || selectedTaskIds.length === 0}
                        className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${selectedTaskIds.length === 0 ? 'bg-slate-300 cursor-not-allowed opacity-50' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20'
                            }`}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <>開啟高效的一天 <Clock size={20} /></>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkPlanModal;
