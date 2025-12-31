import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CheckCircle, Circle, Clock, MoreVertical, User, Calendar, Trash2, Check, ListChecks } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// 解決 TypeScript 類型衝突
const DraggableComponent = Draggable as any;
const DroppableComponent = Droppable as any;

interface Task {
    id: string;
    title: string;
    description?: string;
    due_time?: string;
    status: string;
    is_completed: boolean;
    assigned_to: string[];
    completed_by?: string | null;
}

interface KanbanBoardProps {
    tasks: Task[];
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onEditTask: (task: any) => void;
    onToggleComplete: (task: any) => void;
    onDeleteTask: (taskId: string) => void;
    tasksSubtasks?: Record<string, any[]>; // Pass subtasks to show progress
}

const COLUMNS = [
    { id: 'todo', title: '待辦事項', color: 'bg-slate-400' },
    { id: 'in_progress', title: '進行中', color: 'bg-primary-500' },
    { id: 'done', title: '已完成', color: 'bg-emerald-500' }
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
    tasks,
    onUpdateStatus,
    onEditTask,
    onToggleComplete,
    onDeleteTask,
    tasksSubtasks
}) => {
    const { theme } = useTheme();
    const [boardData, setBoardData] = useState<Record<string, Task[]>>({
        todo: [],
        in_progress: [],
        done: []
    });

    const [isDragging, setIsDragging] = useState(false);

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

    const onDragStart = () => {
        setIsDragging(true);
    };

    const onDragEnd = (result: DropResult) => {
        setIsDragging(false);
        const { destination, source, draggableId } = result;

        if (!destination) return;

        // 1. 處理刪除 (拖曳至垃圾桶)
        if (destination.droppableId === 'trash') {
            onDeleteTask(draggableId);
            return;
        }

        // 2. 處理位置未變動
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // 3. 處理移動
        if (source.droppableId === destination.droppableId) {
            const column = [...boardData[source.droppableId]];
            const [removed] = column.splice(source.index, 1);
            const updatedTask = { ...removed, status: destination.droppableId };
            column.splice(destination.index, 0, updatedTask);

            setBoardData(prev => ({
                ...prev,
                [source.droppableId]: column
            }));
        } else {
            const sourceColumn = [...boardData[source.droppableId]];
            const destColumn = [...boardData[destination.droppableId]];
            const [removed] = sourceColumn.splice(source.index, 1);

            const updatedTask = { ...removed, status: destination.droppableId };
            destColumn.splice(destination.index, 0, updatedTask);

            setBoardData(prev => ({
                ...prev,
                [source.droppableId]: sourceColumn,
                [destination.droppableId]: destColumn
            }));
        }

        onUpdateStatus(draggableId, destination.droppableId);
    };

    return (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                                    {boardData[col.id]?.length || 0}
                                </span>
                            </div>
                        </div>

                        <DroppableComponent droppableId={col.id}>
                            {(provided: any, snapshot: any) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 rounded-2xl p-2 transition-colors ${snapshot.isDraggingOver ? (theme === 'dark' ? 'bg-slate-800/40' : 'bg-slate-100/50') : 'bg-transparent'}`}
                                >
                                    <div className="space-y-3">
                                        {boardData[col.id].map((task, index) => (
                                            <DraggableComponent key={task.id} draggableId={task.id} index={index}>
                                                {(provided: any, snapshot: any) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => onEditTask(task)}
                                                        className={`group p-4 rounded-xl border shadow-sm transition-all duration-200 ${snapshot.isDragging ? 'shadow-2xl scale-105 rotate-2 z-[1001]' : 'z-10'
                                                            } ${theme === 'dark'
                                                                ? 'bg-slate-900 border-slate-800 hover:border-primary-500/50 text-slate-200'
                                                                : 'bg-white border-slate-100 hover:border-primary-200 text-slate-800'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <h4 className={`font-bold text-sm leading-tight ${col.id === 'done' ? 'line-through opacity-50' : ''}`}>
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
                                                            <p className="text-xs line-clamp-2 mb-4 leading-relaxed text-slate-500">
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
                                                            </div>
                                                            {task.due_time && (
                                                                <div className={`flex items-center gap-1 text-[10px] font-bold ${new Date(task.due_time) < new Date() && col.id !== 'done' ? 'text-rose-500' : 'text-slate-400'}`}>
                                                                    <Clock size={12} />
                                                                    {new Date(task.due_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Subtask Progress & Completion Tag */}
                                                        <div className="mt-3 space-y-2">
                                                            {/* Subtask Progress */}
                                                            {tasksSubtasks && tasksSubtasks[task.id] && tasksSubtasks[task.id].length > 0 && (
                                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                                                    <ListChecks size={12} className="text-slate-400" />
                                                                    <span>
                                                                        {tasksSubtasks[task.id].filter(st => st.is_completed).length} / {tasksSubtasks[task.id].length} 子任務
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Completed By Tag */}
                                                            {task.is_completed && task.completed_by && (
                                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 w-fit animate-in fade-in slide-in-from-bottom-1">
                                                                    <Check size={12} />
                                                                    <span className="text-[10px] font-bold">由 {task.completed_by} 完成</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </DraggableComponent>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </DroppableComponent>
                    </div>
                ))}
            </div>

            {/* 修正後的垃圾桶區域 */}
            <DroppableComponent droppableId="trash">
                {(provided: any, snapshot: any) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        // 1. 外部容器始終固定在 bottom-0，確保 dnd 計算出的感應區域不變
                        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-80 h-32 z-[1000] pointer-events-none flex items-end justify-center`}
                    >
                        {/* 2. 內部視覺容器處理動畫和縮放 */}
                        <div className={`
                            w-full h-full rounded-t-[5rem] border-4 border-b-0 flex flex-col items-center justify-center transition-all duration-300 ease-out pointer-events-auto
                            ${isDragging ? 'translate-y-0 opacity-100' : 'translate-y-28 opacity-0'}
                            ${snapshot.isDraggingOver
                                ? 'bg-rose-500 border-rose-600 scale-110 shadow-[0_-10px_40px_rgba(225,29,72,0.5)] text-white'
                                : 'bg-white/90 dark:bg-slate-900/90 border-rose-500 backdrop-blur-md shadow-2xl text-rose-500'
                            }
                        `}>
                            <Trash2
                                size={snapshot.isDraggingOver ? 44 : 32}
                                className={`transition-all duration-300 ${snapshot.isDraggingOver ? 'mb-2 animate-bounce' : ''}`}
                            />
                            <span className="text-xs font-black tracking-widest">
                                {snapshot.isDraggingOver ? '放開以刪除任務' : '拖曳至此處刪除'}
                            </span>

                            {/* 3. 確保 placeholder 在容器內渲染 */}
                            <div className="hidden">{provided.placeholder}</div>
                        </div>
                    </div>
                )}
            </DroppableComponent>
        </DragDropContext>
    );
};

export default KanbanBoard;