import React from 'react';
import { X, PlusSquare } from 'lucide-react';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    formData: any;
    setFormData: (data: any) => void;
    teamMembers: any[];
    onAssignToggle: (username: string) => void;
    isSubmitting: boolean;
    theme: 'light' | 'dark';
    getAvatarUrl: (url: string | null) => string | null;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    setFormData,
    teamMembers,
    onAssignToggle,
    isSubmitting,
    theme,
    getAvatarUrl
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'
                }`}>
                <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        <PlusSquare className="text-primary-500" /> 新增任務
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">標題</label>
                        <input
                            autoFocus
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500/50 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                            placeholder="任務標題..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">截止時間</label>
                            <input
                                type="datetime-local"
                                value={formData.due_time}
                                onChange={e => setFormData({ ...formData, due_time: e.target.value })}
                                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500/50 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                    }`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">指派給</label>
                            <div className={`w-full px-2 py-2 rounded-xl border h-[50px] overflow-x-auto flex items-center gap-1 custom-scrollbar ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                }`}>
                                {teamMembers.map(m => (
                                    <button
                                        key={m.username}
                                        type="button"
                                        onClick={() => onAssignToggle(m.username)}
                                        className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${formData.assigned_to.includes(m.username)
                                                ? 'border-primary-500 scale-110 shadow-md'
                                                : (theme === 'dark' ? 'border-slate-600 opacity-50 hover:opacity-100' : 'border-white opacity-50 hover:opacity-100')
                                            }`}
                                        title={m.username}
                                    >
                                        {m.avatar ? <img src={getAvatarUrl(m.avatar) || ''} alt={m.username} className="w-full h-full rounded-full object-cover" /> : <span className="text-[10px] font-bold">{m.username[0].toUpperCase()}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">描述</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500/50 outline-none transition-all resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                            placeholder="任務描述..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={!formData.title || isSubmitting}
                            className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg shadow-primary-500/30 font-bold"
                        >
                            {isSubmitting ? '建立中...' : '建立任務'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
