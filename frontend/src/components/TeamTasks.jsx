import { useState } from 'react';
import { teamTaskAPI } from '../api';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import TaskItem from './common/TaskItem';

function TeamTasks({ currentUser, onSelectTask, onlineUsers = [] }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({ title: '', due_time: '', description: '' });
    const [assignName, setAssignName] = useState('');
    const [activeEditId, setActiveEditId] = useState(null);
    const [team, setTeam] = useState("Engineering");

    // 1. Fetching
    const { data: tasks = [] } = useQuery({
        queryKey: ['teamTasks', team, currentUser],
        queryFn: () => teamTaskAPI.get(team).then(res => {
            // Filter locally or backend? Current logic is locally
            const all = res.data;
            return all.filter(t => t.assigned_to && t.assigned_to.includes(currentUser));
        }),
        enabled: !!team && !!currentUser
    });

    // 2. Mutations
    const mutationOptions = {
        onSuccess: () => queryClient.invalidateQueries(['teamTasks', team])
    };

    const addMutation = useMutation({
        mutationFn: (data) => teamTaskAPI.add(data, team, currentUser),
        onSuccess: () => {
            mutationOptions.onSuccess();
            toast.success("團隊任務已建立 🤝");
            setFormData({ title: '', due_time: '', description: '' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }) => teamTaskAPI.update(id, data),
        ...mutationOptions
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => teamTaskAPI.delete(id),
        onSuccess: () => {
            mutationOptions.onSuccess();
            toast.success("已刪除");
        }
    });

    const assignMutation = useMutation({
        mutationFn: ({ id, user }) => teamTaskAPI.assign(id, user),
        onSuccess: (_, variables) => {
            mutationOptions.onSuccess();
            toast.success(`已指派成員: ${variables.user}`);
            setAssignName('');
            setActiveEditId(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || "指派失敗")
    });

    // Handlers
    const handleSwitchTeam = () => {
        const newTeam = prompt("切換/建立團隊:", team);
        if (newTeam && newTeam.trim()) {
            setTeam(newTeam.trim());
            toast.success(`已切換至 ${newTeam}`);
        }
    };

    return (
        <div className="card team-container">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0 }}>🚀 團隊任務牆</h3>
                </div>
                <button className="status-badge" onClick={handleSwitchTeam} style={{ background: 'rgba(255,255,255,0.1)', cursor: 'pointer', border: '1px solid var(--glass-border)' }}>
                    🏢 {team} (切換)
                </button>
            </div>

            <div className="task-form-modern" style={{ marginBottom: '25px', display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
                <input
                    type="text"
                    placeholder="任務標題..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    style={{ flex: 1 }}
                />
                <input
                    type="datetime-local"
                    value={formData.due_time}
                    onChange={e => setFormData({ ...formData, due_time: e.target.value })}
                    style={{ width: 'auto' }}
                />
                <button className="primary" onClick={() => {
                    if (!formData.title) return toast.error("請輸入標題");
                    addMutation.mutate(formData);
                }}>建立</button>
            </div>

            <div className="team-list">
                <AnimatePresence>
                    {tasks.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} style={{ textAlign: 'center', marginTop: '20px', padding: '20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                            📪 您在 【{team}】 團隊目前無指派任務
                        </motion.div>
                    ) : tasks.map(t => (
                        <TaskItem
                            key={t.id}
                            task={t}
                            onClick={() => onSelectTask(t)}
                            metaInfo={<span>ID: {t.id.slice(0, 6)}</span>}
                            onRename={(task) => {
                                const newName = prompt("修改名稱", task.title);
                                if (newName) updateMutation.mutate({ id: task.id, title: newName });
                            }}
                            onDelete={(task) => {
                                if (confirm("刪除?")) deleteMutation.mutate(task.id);
                            }}
                            children={
                                <div className="member-section" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {t.assigned_to && t.assigned_to.length > 0 ? t.assigned_to.map((m, i) => {
                                            const isOnline = onlineUsers.includes(m);
                                            return (
                                                <span key={i} className={`status-badge ${isOnline ? 'online' : 'offline'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {isOnline ? '●' : '○'} {m}
                                                </span>
                                            );
                                        }) : <span style={{ fontSize: '0.8rem', color: '#666' }}>無指派成員</span>}
                                    </div>

                                    <div className="assign-box" onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '5px' }}>
                                        <input
                                            placeholder="+ 指派成員"
                                            value={activeEditId === t.id ? assignName : ''}
                                            onFocus={() => setActiveEditId(t.id)}
                                            onChange={e => setAssignName(e.target.value)}
                                            style={{ width: '100px', fontSize: '0.8rem', padding: '4px 8px', background: 'transparent' }}
                                            onKeyPress={e => e.key === 'Enter' && assignMutation.mutate({ id: t.id, user: assignName })}
                                        />
                                        {activeEditId === t.id && assignName && <button onClick={() => assignMutation.mutate({ id: t.id, user: assignName })} style={{ padding: '2px 8px', fontSize: '0.8rem' }}>OK</button>}
                                    </div>
                                </div>
                            }
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default TeamTasks;