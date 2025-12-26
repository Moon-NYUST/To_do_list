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
    isToday
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Task {
    id: string;
    title: string;
    due_time?: string;
    is_completed: boolean;
    assigned_to?: string[];
}

interface CalendarViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEditTask }) => {
    const { theme } = useTheme();
    const [currentMonth, setCurrentMonth] = useState(new Date());

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

        return (
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                {calendarDays.map((day, i) => {
                    const dayTasks = tasks.filter(task => task.due_time && isSameDay(new Date(task.due_time), day));

                    return (
                        <div
                            key={i}
                            className={`min-h-[120px] p-2 transition-colors ${!isSameMonth(day, monthStart)
                                    ? (theme === 'dark' ? 'bg-slate-950/50' : 'bg-slate-50/50')
                                    : (theme === 'dark' ? 'bg-slate-900' : 'bg-white')
                                }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday(day)
                                        ? 'bg-primary-600 text-white'
                                        : (!isSameMonth(day, monthStart) ? 'text-slate-400' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400'))
                                    }`}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="space-y-1">
                                {dayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => onEditTask(task)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all border truncate ${task.is_completed
                                                ? 'opacity-50 line-through bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                                : (theme === 'dark'
                                                    ? 'bg-primary-900/20 border-primary-900/30 text-primary-400 hover:bg-primary-900/40'
                                                    : 'bg-primary-50 border-primary-100 text-primary-700 hover:bg-primary-100')
                                            }`}
                                        title={task.title}
                                    >
                                        {task.title}
                                    </div>
                                ))}
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
        </div>
    );
};

export default CalendarView;
