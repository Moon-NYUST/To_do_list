import { motion } from 'framer-motion';

// A shared component for both Personal and Team tasks
// Props:
// - task: The task object
// - onToggle: (task) => void (Optional)
// - onDelete: (task) => void
// - onRename: (task) => void
// - ActionButtons: ReactNode (Extra buttons like 'Promote' or 'Assign')
// - metaInfo: ReactNode (Extra info like 'ID', 'Creator')

const TaskItem = ({ task, onToggle, onDelete, onRename, ActionButtons, metaInfo, onClick, children }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.005 }}
            className={`task-item ${task.completed ? 'done' : ''}`}
            onClick={onClick}
            style={{ opacity: task.completed ? 0.6 : 1, cursor: onClick ? 'pointer' : 'default', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                {onToggle && (
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(e) => { e.stopPropagation(); onToggle(task); }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '500', textDecoration: task.completed ? 'line-through' : 'none' }}>
                        {task.title}
                    </span>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {task.remaining_time && <span style={{ color: task.remaining_time === '已過期' ? 'var(--danger)' : 'var(--warning)' }}>⏳ {task.remaining_time}</span>}
                        {metaInfo}
                    </div>
                </div>

                <div className="item-actions" style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                    {ActionButtons}
                    {onRename && <button className="icon-btn" onClick={() => onRename(task)}>📝</button>}
                    {onDelete && <button className="icon-btn danger" onClick={() => onDelete(task)}>✕</button>}
                </div>
            </div>

            {/* Slot for Team Task Member List or other bottom content */}
            {children && <div style={{ width: '100%' }}>{children}</div>}
        </motion.div>
    );
};

export default TaskItem;
