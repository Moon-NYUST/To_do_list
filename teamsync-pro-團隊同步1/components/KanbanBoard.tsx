import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CheckCircle, Circle, Clock, MoreVertical, User, Calendar } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    is_completed: boolean;
    assigned_to: string[];
    due_time?: string;
}

interface KanbanBoardProps {
    tasks: Task[];
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onEditTask: (task: Task) => void;
    onToggleComplete: (task: Task) => void;
}

const COLUMNS = [
    { id: 'todo', title: '待辦事項', color: 'bg-slate-400' },
    { id: 'in_progress', title: '進行中', color: 'bg-primary-500' },
    { id: 'done', title: '已完成', color: 'bg-emerald-500' }
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateStatus, onEditTask, onToggleComplete }) => {
    const { theme } = useTheme();
    const [boardData, setBoardData] = useState<Record<string, Task[]>>({
        todo: [],
        in_progress: [],
        done: []
    });

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

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        onUpdateStatus(draggableId, destination.droppableId);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
                {COLUMNS.map(col => (
                    <div key={col.id} className="flex flex-col w-[320px] min-w-[320px] h-full">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                                <h3 className={`font-black text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {col.title}
                                </h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'}`}>
                                    {boardData[col.id].length}
                                </span>
                            </div>
                        </div>

                        <Droppable droppableId={col.id}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 rounded-2xl p-2 transition-colors ${snapshot.isDraggingOver ? (theme === 'dark' ? 'bg-slate-800/40' : 'bg-slate-100/50') : 'bg-transparent'}`}
                                >
                                    <div className="space-y-3">
                                        {boardData[col.id].map((task, index) => (
                                            /* @ts-ignore */
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => onEditTask(task)}
                                                        className={`group p-4 rounded-xl border shadow-sm transition-all animate-in fade-in duration-300 ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50' : ''
                                                            } ${theme === 'dark'
                                                                ? 'bg-slate-900 border-slate-800 hover:border-primary-500/50'
                                                                : 'bg-white border-slate-100 hover:border-primary-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <h4 className={`font-bold text-sm leading-tight ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} ${col.id === 'done' ? 'line-through opacity-50' : ''}`}>
                                                                {task.title}
                                                            </h4>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
                                                                className={`shrink-0 transition-colors ${task.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-primary-500'}`}
                                                            >
                                                                {task.is_completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                                                            </button>
                                                        </div>

                                                        {task.description && (
                                                            <p className={`text-xs line-clamp-2 mb-4 leading-relaxed ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                                                {task.description}
                                                            </p>
                                                        )}

                                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                                                            <div className="flex -space-x-1.5 overflow-hidden">
                                                                {task.assigned_to.slice(0, 3).map((user, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-900 text-slate-400' : 'bg-slate-100 border-white text-slate-600'}`}
                                                                        title={user}
                                                                    >
                                                                        {user[0].toUpperCase()}
                                                                    </div>
                                                                ))}
                                                                {task.assigned_to.length > 3 && (
                                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                                                        +{task.assigned_to.length - 3}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {task.due_time && (
                                                                    <div className={`flex items-center gap-1 text-[10px] font-bold ${new Date(task.due_time) < new Date() && col.id !== 'done' ? 'text-rose-500' : 'text-slate-400'}`}>
                                                                        <Clock size={12} />
                                                                        {new Date(task.due_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
};

export default KanbanBoard;
