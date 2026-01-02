import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CheckCircle, Circle, Clock, Trash2, Lock, Users } from 'lucide-react'; // 補上 Users
import { useTheme } from '../context/ThemeContext';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DraggableComponent = Draggable as any;
const DroppableComponent = Droppable as any;

const getAvatarUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;

    // 確保 API_BASE_URL 和 url 之間只有一個斜線
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${path}`;
};

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    is_completed: boolean;
    assigned_to?: string[];
    due_time?: string;
}

interface KanbanBoardProps {
    tasks: Task[];
    userMap?: Record<string, string>; // 已有的定義
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onEditTask: (task: Task) => void;
    onToggleComplete: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
}

const COLUMNS = [
    { id: 'todo', title: '待辦事項', color: 'bg-slate-400' },
    { id: 'in_progress', title: '進行中', color: 'bg-primary-500' },
    { id: 'done', title: '已完成', color: 'bg-emerald-500' }
];

// 1. 在這裡解構出 userMap
const KanbanBoard: React.FC<KanbanBoardProps> = ({
    tasks,
    userMap = {}, // <--- 這裡要收 userMap，預設給空物件防止報錯
    onUpdateStatus,
    onEditTask,
    onToggleComplete,
    onDeleteTask
}) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [boardData, setBoardData] = useState<Record<string, Task[]>>({
        todo: [],
        in_progress: [],
        done: []
    });

    const [isDragging, setIsDragging] = useState(false);
    const [shakingId, setShakingId] = useState<string | null>(null);

    useEffect(() => {
        const data: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
        tasks.forEach(task => {
            const status = task.status || (task.is_completed ? 'done' : 'todo');
            if (data[status]) {
                data[status].push(task);
            } else {
                data.todo.push(task);
            }
        });
        setBoardData(data);
    }, [tasks]);

    const triggerShake = (taskId: string) => {
        setShakingId(taskId);
        setTimeout(() => setShakingId(null), 400);
    };

    const onDragStart = () => setIsDragging(true);

    const onDragEnd = (result: DropResult) => {
        setIsDragging(false);
        const { destination, source, draggableId } = result;
        if (!destination) return;

        if (destination.droppableId === 'trash') {
            onDeleteTask(draggableId);
            return;
        }

        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        onUpdateStatus(draggableId, destination.droppableId);
    };

    return (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full overflow-x-auto pb-4 min-h-[500px]">
                {COLUMNS.map(column => (
                    <div key={column.id} className="flex-1 min-w-[320px] flex flex-col">
                        {/* 欄位標題 */}
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${column.color}`}></div>
                                <h3 className="font-black text-slate-500 uppercase tracking-wider text-sm">
                                    {column.title} ({boardData[column.id].length})
                                </h3>
                            </div>
                        </div>

                        <DroppableComponent droppableId={column.id}>
                            {(provided: any, snapshot: any) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 rounded-2xl transition-colors ${snapshot.isDraggingOver
                                        ? (theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100/50')
                                        : 'bg-transparent'
                                        }`}
                                >
                                    {boardData[column.id].map((task, index) => {
                                        const myUsername = typeof user === 'string' ? user : (user as any)?.username;
                                        const isAssignedToMe = Array.isArray(task.assigned_to) && task.assigned_to.includes(myUsername || '');

                                        return (
                                            <DraggableComponent
                                                key={task.id}
                                                draggableId={task.id}
                                                index={index}
                                                isDragDisabled={!isAssignedToMe}
                                            >
                                                {(provided: any) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => {
                                                            if (isAssignedToMe) {
                                                                onEditTask(task);
                                                            } else {
                                                                triggerShake(task.id);
                                                                toast.error("無權編輯此任務");
                                                            }
                                                        }}
                                                        className={`
                                                            group mb-3 p-4 rounded-xl border shadow-sm transition-all
                                                            ${theme === 'dark'
                                                                ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                                                : 'bg-white border-slate-100 hover:shadow-md'}
                                                            ${shakingId === task.id ? 'animate-shake' : ''}
                                                            ${!isAssignedToMe ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
                                                        `}
                                                    >
                                                        {/* 標題與狀態 */}
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isAssignedToMe) {
                                                                            onToggleComplete(task);
                                                                        } else {
                                                                            triggerShake(task.id);
                                                                            toast.error("無權操作此任務");
                                                                        }
                                                                    }}
                                                                    className={`${task.is_completed ? 'text-emerald-500' : 'text-slate-300'}`}
                                                                >
                                                                    {task.is_completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                                                                </button>
                                                                <span className={`font-bold ${task.is_completed ? 'line-through text-slate-500' : ''}`}>
                                                                    {task.title}
                                                                </span>
                                                            </div>
                                                            {!isAssignedToMe && <Lock size={14} className="text-slate-400" />}
                                                        </div>

                                                        {/* 底部資訊：頭像顯示在這裡 */}
                                                        <div className="flex items-center justify-between mt-4">
                                                            {/* 這裡就是頭像區域 */}
                                                            <div className="flex -space-x-1.5">
                                                                {task.assigned_to?.slice(0, 3).map((username, i) => {
                                                                    // 2. 從地圖裡拿頭像
                                                                    const avatarPath = userMap[username];
                                                                    const avatarUrl = getAvatarUrl(avatarPath);

                                                                    return (
                                                                        <div
                                                                            key={i}
                                                                            className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden"
                                                                            title={username}
                                                                        >
                                                                            {avatarUrl ? (
                                                                                <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold text-slate-500">
                                                                                    {username[0]?.toUpperCase()}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {(task.assigned_to?.length || 0) > 3 && (
                                                                    <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                                                        +{task.assigned_to!.length - 3}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 截止日期 */}
                                                            {task.due_time && (
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                                    <Clock size={12} />
                                                                    {new Date(task.due_time).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </DraggableComponent>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </DroppableComponent>
                    </div>
                ))}
            </div>

            {/* 垃圾桶 */}
            <DroppableComponent droppableId="trash">
                {(provided: any, snapshot: any) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-80 h-32 z-[2000] pointer-events-none"
                    >
                        <div
                            className={`w-full h-full rounded-t-[5rem] border-4 border-b-0 flex flex-col items-center justify-center transition-all duration-300 ease-out pointer-events-auto
                                ${isDragging ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
                                ${snapshot.isDraggingOver
                                    ? 'bg-rose-500 border-rose-600 scale-110 shadow-[0_-10px_40px_rgba(225,29,72,0.5)] text-white'
                                    : 'bg-white/90 dark:bg-slate-900/90 border-rose-500 backdrop-blur-md shadow-2xl text-rose-500'
                                }
                            `}
                        >
                            <Trash2 size={snapshot.isDraggingOver ? 48 : 32} className={`transition-all duration-300 ${snapshot.isDraggingOver ? 'mb-2 animate-bounce' : 'mb-1'}`} />
                            <span className="text-xs font-black tracking-widest uppercase">
                                {snapshot.isDraggingOver ? '放開以刪除' : '拖曳至此處刪除'}
                            </span>
                        </div>
                        <div className="hidden">{provided.placeholder}</div>
                    </div>
                )}
            </DroppableComponent>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-6px) rotate(-1.5deg); }
                    75% { transform: translateX(6px) rotate(1.5deg); }
                }
                .animate-shake {
                    animation: shake 0.15s ease-in-out 0s 2;
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.3) !important;
                }
            `}</style>
        </DragDropContext>
    );
};

export default KanbanBoard;