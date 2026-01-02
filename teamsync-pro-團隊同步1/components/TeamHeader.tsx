import React from 'react';
import {
    List as ListIcon,
    Trello,
    Calendar as CalendarIcon,
    UserPlus,
    Plus
} from 'lucide-react';

interface TeamHeaderProps {
    activeTeam: string;
    teamMembersCount: number;
    viewMode: 'list' | 'kanban' | 'calendar';
    setViewMode: (mode: 'list' | 'kanban' | 'calendar') => void;
    theme: 'light' | 'dark';
    onInvite: () => void;
    onCreateTask: () => void;
}

const TeamHeader: React.FC<TeamHeaderProps> = ({
    activeTeam,
    teamMembersCount,
    viewMode,
    setViewMode,
    theme,
    onInvite,
    onCreateTask
}) => {
    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
                <div>
                    <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        {activeTeam} <span className="text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-md">TEAM</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">共 {teamMembersCount} 位成員</p>
                </div>

                <div className={`flex items-center p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list'
                                ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm')
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <ListIcon size={14} /> 列表
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban'
                                ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm')
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Trello size={14} /> 看板
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar'
                                ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm')
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <CalendarIcon size={14} /> 日曆
                    </button>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onInvite}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border ${theme === 'dark'
                            ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    <UserPlus size={18} /> 邀請
                </button>
                <button
                    onClick={onCreateTask}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all"
                >
                    <Plus size={18} /> 新增任務
                </button>
            </div>
        </div>
    );
};

export default TeamHeader;
