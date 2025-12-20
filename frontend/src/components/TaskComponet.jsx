import { useState } from 'react';

function TaskItem({ task, onUpdate, onDelete, onShowChat, isTeamTask }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ...task });

    // 格式化日期以符合 input datetime-local 的要求
    const formatDateTime = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toISOString().slice(0, 16);
    };

    const handleSave = () => {
        onUpdate(task.id, editData);
        setIsEditing(false);
    };

    return (
        <div className={`task-card-modern ${task.completed ? 'is-done' : ''}`}>
            {isEditing ? (
                <div className="edit-mode">
                    <input 
                        className="edit-input"
                        value={editData.title} 
                        onChange={e => setEditData({...editData, title: e.target.value})} 
                        placeholder="標題"
                    />
                    <textarea 
                        className="edit-input"
                        value={editData.description || ''} 
                        onChange={e => setEditData({...editData, description: e.target.value})} 
                        placeholder="描述..."
                    />
                    <input 
                        type="datetime-local" 
                        className="edit-input"
                        value={formatDateTime(editData.due_time)}
                        onChange={e => setEditData({...editData, due_time: e.target.value})} 
                    />
                    <div className="edit-actions">
                        <button className="save-btn" onClick={handleSave}>儲存</button>
                        <button className="cancel-btn" onClick={() => setIsEditing(false)}>取消</button>
                    </div>
                </div>
            ) : (
                <div className="view-mode">
                    <div className="card-top">
                        <span className="task-id">ID: {task.id.slice(0, 8)}</span>
                        <div className="card-controls">
                            <input 
                                type="checkbox" 
                                checked={task.completed} 
                                onChange={() => onUpdate(task.id, { ...task, completed: !task.completed })} 
                            />
                            <button className="mini-btn" onClick={() => setIsEditing(true)}>📝</button>
                            <button className="mini-btn del" onClick={() => onDelete(task.id)}>✕</button>
                        </div>
                    </div>
                    
                    <div className="card-content">
                        <h4 className="task-title">{task.title}</h4>
                        <p className="task-desc">{task.description || "無描述"}</p>
                        
                        <div className="task-meta">
                            <span className="due-date">
                                📅 {task.due_time ? new Date(task.due_time).toLocaleString() : '未設定時間'}
                            </span>
                            {task.remaining_time && (
                                <span className={`time-left ${task.remaining_time === '已過期' ? 'expired' : ''}`}>
                                    ⏳ {task.remaining_time}
                                </span>
                            )}
                        </div>

                        {/* 如果是團隊任務，顯示指派成員 */}
                        {isTeamTask && (
                            <div className="member-section">
                                👤 {task.assigned_to?.length > 0 ? task.assigned_to.join(', ') : '未指派'}
                            </div>
                        )}
                    </div>

                    <div className="card-footer">
                        <button className="chat-btn" onClick={() => onShowChat(task)}>
                            💬 進入任務聊天室
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .task-card-modern { background: white; border-radius: 12px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 5px solid #007bff; transition: 0.3s; }
                .task-card-modern.is-done { border-left-color: #28a745; opacity: 0.7; }
                .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .task-id { font-size: 0.7rem; color: #aaa; }
                .task-title { margin: 0 0 5px 0; font-size: 1.1rem; }
                .task-desc { font-size: 0.85rem; color: #666; margin-bottom: 10px; }
                .task-meta { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; margin-bottom: 10px; }
                .time-left { font-weight: bold; color: #e67e22; }
                .time-left.expired { color: #dc3545; }
                .edit-input { width: 100%; margin-bottom: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
                .edit-actions { display: flex; gap: 5px; }
                .chat-btn { width: 100%; background: #f0f2f5; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
                .chat-btn:hover { background: #e4e6eb; color: #007bff; }
                .member-section { font-size: 0.8rem; background: #f8f9fa; padding: 5px; border-radius: 4px; margin-bottom: 10px; }
                .mini-btn { background: none; border: none; cursor: pointer; font-size: 1rem; }
                .mini-btn.del:hover { color: #dc3545; }
            `}</style>
        </div>
    );
}

export default TaskItem;