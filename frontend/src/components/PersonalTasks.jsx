import { useState } from 'react';
import { personalTaskAPI } from '../api';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import TaskItem from './common/TaskItem';

function PersonalTasks({ currentUser }) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [sortBy, setSortBy] = useState('due_time');

    // 1. React Query Fetching
    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['personalTasks', currentUser, sortBy],
        queryFn: () => personalTaskAPI.get(currentUser, sortBy, 'asc').then(res => res.data),
        enabled: !!currentUser
    });

    // 2. Mutations
    const addMutation = useMutation({
        mutationFn: (payload) => personalTaskAPI.add(payload, currentUser),
        onSuccess: () => {
            queryClient.invalidateQueries(['personalTasks']);
            toast.success("已新增 ✨");
            setTitle('');
            setDueDate('');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }) => personalTaskAPI.update(id, data),
        onSuccess: () => queryClient.invalidateQueries(['personalTasks'])
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => personalTaskAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['personalTasks']);
            toast.success("已移除 🗑️");
        }
    });

    const promoteMutation = useMutation({
        mutationFn: ({ id, team }) => personalTaskAPI.promote(id, team),
        onSuccess: () => {
            queryClient.invalidateQueries(['personalTasks']);
            toast.success("轉移成功 🚀");
        }
    });

    // Handlers
    const handleAdd = () => {
        if (!title) return;
        addMutation.mutate({ title, due_time: dueDate || null });
    };

    const handlePromote = (task) => {
        const teamName = prompt("✈️ 請輸入要轉移到的團隊名稱:", "Engineering");
        if (teamName && confirm(`確定轉移至「${teamName}」?`)) {
            promoteMutation.mutate({ id: task.id, team: teamName });
        }
    };

    return (
        <div className="card personal-container">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0 }}>📋 個人待辦</h3>
                    <select onChange={(e) => setSortBy(e.target.value)} className="mini-select" style={{ width: 'auto', padding: '4px 8px' }}>
                        <option value="due_time">按時間</option>
                        <option value="title">按名稱</option>
                    </select>
                </div>
            </div>

            <div className="quick-add" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="新增待辦事項..."
                        onKeyPress={e => e.key === 'Enter' && handleAdd()}
                        style={{ flex: 1 }}
                    />
                    <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        style={{ width: '180px' }}
                    />
                    <button className="primary" onClick={handleAdd} disabled={addMutation.isLoading}>
                        {addMutation.isLoading ? '...' : '新增'}
                    </button>
                </div>
            </div>

            <div className="task-list">
                <AnimatePresence>
                    {tasks.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} style={{ textAlign: 'center', marginTop: '20px' }}>
                            {isLoading ? '載入中...' : '☕ 暫無待辦事項'}
                        </motion.div>
                    ) : tasks.map(t => (
                        <TaskItem
                            key={t.id}
                            task={t}
                            onToggle={(task) => updateMutation.mutate({ id: task.id, completed: !task.completed })}
                            onDelete={(task) => {
                                if (confirm("確認刪除?")) deleteMutation.mutate(task.id);
                            }}
                            onRename={(task) => {
                                const newName = prompt("修改名稱", task.title);
                                if (newName) updateMutation.mutate({ id: task.id, title: newName });
                            }}
                            ActionButtons={
                                <button className="icon-btn" title="轉為團隊任務" onClick={() => handlePromote(t)}>🚀</button>
                            }
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default PersonalTasks;