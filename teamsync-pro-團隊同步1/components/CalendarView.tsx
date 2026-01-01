import React, { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    isToday,
    isWithinInterval,
    parseISO,
    startOfDay
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

interface Task {
    id: string;
    title: string;
    due_time?: string;
    created_at?: string;
    is_completed: boolean;
    assigned_to?: string[];
    status?: string;
}

interface CalendarViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onTaskUpdate?: () => void;
}

const COLORS = [
    'bg-blue-500 border-blue-600 custom-text-white',
    'bg-green-500 border-green-600 custom-text-white',
    'bg-purple-500 border-purple-600 custom-text-white',
    'bg-orange-500 border-orange-600 custom-text-white',
    'bg-pink-500 border-pink-600 custom-text-white',
    'bg-cyan-500 border-cyan-600 custom-text-white',
    'bg-indigo-500 border-indigo-600 custom-text-white',
    'bg-rose-500 border-rose-600 custom-text-white',
];

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEditTask, onTaskUpdate }) => {
    const { theme } = useTheme();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/task-id');
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        let newDueTime = new Date(targetDate);
        if (task.due_time) {
            const oldDue = new Date(task.due_time);
            newDueTime.setHours(oldDue.getHours(), oldDue.getMinutes());
        } else {
            newDueTime.setHours(23, 59);
        }

        try {
            // [優化] 根據路由或 Prop 判斷，或者保留此邏輯但先處理個人任務
            // 如果是在個人任務頁面，可以直接調用個人 API
            await api.put(`/tasks/personal/${taskId}`, { due_time: newDueTime.toISOString() });
            if (onTaskUpdate) onTaskUpdate();
        } catch (err) {
            // 如果失敗，嘗試團隊 API
            try {
                await api.put(`/tasks/team/${taskId}`, { due_time: newDueTime.toISOString() });
                if (onTaskUpdate) onTaskUpdate();
            } catch (e) {
                console.error("Update failed", e);
            }
        }
    };

    const getTaskColor = (taskId: string) => {
        let hash = 0;
        for (let i = 0; i < taskId.length; i++) {
            hash = taskId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return COLORS[Math.abs(hash) % COLORS.length];
    };

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-8">
                <h2 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    {format(currentMonth, 'yyyy年 MMMM', { locale: zhTW })}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className={`p-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className={`px-4 py-2 rounded-xl border font-bold text-sm transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        今天
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className={`p-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map((day, i) => (
                    <div key={i} className="text-center text-xs font-black text-slate-400 uppercase tracking-widest py-2">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const calendarDays = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

        // 1. Pre-calculate layout
        const viewTasks = tasks.filter(task => {
            const start = task.created_at ? startOfDay(new Date(task.created_at)) : null;
            const end = task.due_time ? startOfDay(new Date(task.due_time)) : null;
            if (!end) return false;

            if (start) {
                return start <= endDate && end >= startDate;
            }
            return end >= startDate && end <= endDate;
        });

        // Sort by start date, then duration desc
        viewTasks.sort((a, b) => {
            const startA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const startB = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (startA !== startB) return startA - startB;
            const durA = (a.due_time ? new Date(a.due_time).getTime() : 0) - startA;
            const durB = (b.due_time ? new Date(b.due_time).getTime() : 0) - startB;
            return durB - durA;
        });

        // Assign rows
        const taskRows: Record<string, number> = {};
        const rowEndDates: number[] = [];

        viewTasks.forEach(task => {
            const start = task.created_at ? new Date(task.created_at).getTime() : 0;
            const end = task.due_time ? new Date(task.due_time).getTime() : 0;

            let assignedRow = -1;
            for (let i = 0; i < rowEndDates.length; i++) {
                if (rowEndDates[i] < start) {
                    assignedRow = i;
                    rowEndDates[i] = end;
                    break;
                }
            }

            if (assignedRow === -1) {
                assignedRow = rowEndDates.length;
                rowEndDates.push(end);
            }

            taskRows[task.id] = assignedRow;
        });

        const maxRows = rowEndDates.length;

        return (
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                {calendarDays.map((day, i) => {
                    const current = startOfDay(day);

                    const slots = new Array(maxRows).fill(null);

                    viewTasks.forEach(task => {
                        const start = task.created_at ? startOfDay(new Date(task.created_at)) : null;
                        const end = task.due_time ? startOfDay(new Date(task.due_time)) : null;

                        let isCovered = false;
                        if (start && end) {
                            isCovered = current >= start && current <= end;
                        } else if (end) {
                            isCovered = isSameDay(current, end);
                        }

                        if (isCovered) {
                            const row = taskRows[task.id];
                            if (row !== undefined) {
                                slots[row] = task;
                            }
                        }
                    });

                    return (
                        <div
                            key={i}
                            className={`min-h-[140px] p-2 transition-colors relative flex flex-col gap-1 ${!isSameMonth(day, monthStart)
                                ? (theme === 'dark' ? 'bg-slate-950/50' : 'bg-slate-50/50')
                                : (theme === 'dark' ? 'bg-slate-900' : 'bg-white')
                                }`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, day)}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday(day)
                                    ? 'bg-primary-600 text-white'
                                    : (!isSameMonth(day, monthStart) ? 'text-slate-400' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400'))
                                    }`}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="flex-1 w-full space-y-1">
                                {slots.map((task, rowIndex) => {
                                    if (!task) {
                                        return <div key={`empty-${rowIndex}`} className="h-6" />;
                                    }

                                    const start = task.created_at ? startOfDay(new Date(task.created_at)) : null;
                                    const end = task.due_time ? startOfDay(new Date(task.due_time)) : null;

                                    const isStart = start ? isSameDay(current, start) : false;
                                    const isEnd = end ? isSameDay(current, end) : true;
                                    const isMiddle = !isStart && !isEnd;
                                    const isFirstDayOfWeek = isSameDay(current, startOfWeek(current));

                                    const colorClass = getTaskColor(task.id);

                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/task-id', task.id);
                                            }}
                                            onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                            className={`text-[10px] font-bold cursor-grab active:cursor-grabbing border-y h-6 flex items-center px-2 truncate relative z-10
                                                ${colorClass}
                                                ${isStart ? 'rounded-l-md border-l ml-1' : '-ml-3 border-l-0'}
                                                ${isEnd ? 'rounded-r-md border-r mr-1' : '-mr-3 border-r-0'}
                                                hover:brightness-110 hover:z-20
                                            `}
                                            title={`${task.title} (${task.due_time ? format(new Date(task.due_time), 'MM/dd') : ''})`}
                                            style={{
                                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            {(isStart || isFirstDayOfWeek) && (
                                                <span className="truncate w-full text-white sticky left-0">{task.title}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            {renderHeader()}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {renderDays()}
                {renderCells()}
            </div>
            <style>{`
                .custom-text-white { color: white !important; }
            `}</style>
        </div>
    );
};

export default CalendarView;
