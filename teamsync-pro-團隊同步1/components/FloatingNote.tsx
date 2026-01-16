import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Circle, Clock, Minus, Maximize2, Coffee, Send, Loader2, ListChecks } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

interface Task {
    id: string;
    title: string;
}

interface FloatingNoteProps {
    session: {
        id: number;
        clock_in: string;
        planned_hours: number;
        task_ids?: string;
        initial_task_titles?: string;
    };
    onFinished: () => void;
}

const FloatingNote: React.FC<FloatingNoteProps> = ({ session, onFinished }) => {
    const { theme } = useTheme();
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: window.innerWidth - 340, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const [mode, setMode] = useState<'working' | 'report'>('working');
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [report, setReport] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 解析任務
    const taskIds = session.task_ids ? session.task_ids.split(',') : [];
    const taskTitles = session.initial_task_titles ? session.initial_task_titles.split(',') : [];
    const tasks = taskIds.map((id, index) => ({ id, title: taskTitles[index] || '未知任務' }));

    const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

    // 計時器邏輯
    useEffect(() => {
        const calculateTime = () => {
            const startTime = new Date(session.clock_in).getTime();
            const plannedMs = session.planned_hours * 3600000;
            const endTime = startTime + plannedMs;
            const now = new Date().getTime();
            return Math.max(0, Math.floor((endTime - now) / 1000));
        };

        setTimeLeft(calculateTime());
        const interval = setInterval(() => {
            const remaining = calculateTime();
            setTimeLeft(remaining);
            if (remaining <= 0 && mode === 'working') {
                // 時間到，不自動轉模式，讓使用者決定，但給個提醒？
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [session, mode]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleTaskToggle = async (taskId: string) => {
        const isNowCompleted = !completedTaskIds.includes(taskId);
        if (isNowCompleted) {
            setCompletedTaskIds(prev => [...prev, taskId]);
        } else {
            setCompletedTaskIds(prev => prev.filter(id => id !== taskId));
        }

        try {
            // 同步更新任務狀態至後端
            // 優先嘗試個人任務 API
            await api.put(`/tasks/personal/${taskId}`, { is_completed: isNowCompleted });
        } catch (err) {
            try {
                // 嘗試團隊任務 API
                await api.put(`/tasks/team/${taskId}`, { is_completed: isNowCompleted });
            } catch (e) {
                console.error("Failed to sync task status", e);
            }
        }
    };

    const handleSubmitReport = async () => {
        setIsLoading(true);
        try {
            const currentUsername = JSON.parse(localStorage.getItem('user') || '""');
            await api.post('/attendance/clock-out', {
                user: currentUsername,
                report_summary: report,
                completed_tasks: completedTaskIds.join(',')
            });
            onFinished();
        } catch (err) {
            alert("提交報告失敗");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragStartRef.current.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 400, e.clientY - dragStartRef.current.y));
            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const totalWorkedMs = new Date().getTime() - new Date(session.clock_in).getTime();
    const isOverEightHours = totalWorkedMs > 8 * 3600000;

    return (
        <div
            className={`fixed z-[101] flex flex-col shadow-2xl rounded-3xl border overflow-hidden transition-all duration-300 ease-out ${isMinimized ? 'h-16 w-64' : 'h-[460px] w-80'} ${theme === 'dark' ? 'bg-slate-900 border-slate-700 shadow-black/80' : 'bg-white border-slate-200 shadow-slate-400/50'}`}
            style={{ left: position.x, top: position.y }}
        >
            {/* Header */}
            <div
                className={`px-5 py-4 flex items-center justify-between cursor-move select-none ${theme === 'dark' ? 'bg-slate-800' : 'bg-primary-600 text-white'}`}
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2">
                    <ListChecks size={18} />
                    <span className="font-black text-xs tracking-widest uppercase">今日任務卡</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {mode === 'working' ? (
                        <>
                            {/* Timer Area */}
                            <div className={`p-6 text-center border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-800/20' : 'border-slate-100 bg-slate-50'}`}>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">距離完成目標還有</p>
                                <div className={`text-4xl font-mono font-black tracking-tighter ${timeLeft === 0 ? 'text-rose-500 animate-pulse' : (theme === 'dark' ? 'text-white' : 'text-slate-900')}`}>
                                    {formatTime(timeLeft)}
                                </div>
                            </div>

                            {/* Task List */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                                {tasks.map((task) => {
                                    const isDone = completedTaskIds.includes(task.id);
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleTaskToggle(task.id)}
                                            className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${isDone
                                                    ? 'bg-emerald-50/50 border-emerald-200 opacity-60'
                                                    : (theme === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:border-primary-500' : 'bg-white border-slate-100 hover:border-primary-300')
                                                }`}
                                        >
                                            <div className={isDone ? 'text-emerald-500' : 'text-slate-300'}>
                                                {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                            </div>
                                            <p className={`text-xs font-bold truncate ${isDone ? 'line-through text-slate-400' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-700')}`}>
                                                {task.title}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-5 space-y-3 border-t border-slate-100 dark:border-slate-800">
                                {isOverEightHours && (
                                    <div className="flex items-center justify-center gap-2 text-amber-500 font-bold text-[10px] animate-bounce">
                                        <Coffee size={14} /> 記得休息喔～
                                    </div>
                                )}
                                <button
                                    onClick={() => setMode('report')}
                                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-primary-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    結束工作 & 填寫報告 <Send size={14} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Report Input Area */}
                            <div className="flex-1 p-5 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>今日總結</h3>
                                    <button onClick={() => setMode('working')} className="text-[10px] font-bold text-slate-400 hover:text-primary-500">返回</button>
                                </div>
                                <textarea
                                    placeholder="寫下今天完成的內容或遇到的問題..."
                                    value={report}
                                    onChange={(e) => setReport(e.target.value)}
                                    className={`flex-1 p-4 rounded-2xl border outline-none resize-none text-sm font-medium transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-primary-500'}`}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase w-full">完成任務：</p>
                                    {completedTaskIds.length === 0 ? (
                                        <span className="text-xs text-slate-400 italic">無</span>
                                    ) : (
                                        tasks.filter(t => completedTaskIds.includes(t.id)).map(t => (
                                            <span key={t.id} className="px-2 py-1 bg-emerald-500 text-white text-[9px] font-bold rounded-lg leading-none">{t.title}</span>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={handleSubmitReport}
                                    disabled={isLoading}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : <>正式簽退 <CheckCircle2 size={14} /></>}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default FloatingNote;
