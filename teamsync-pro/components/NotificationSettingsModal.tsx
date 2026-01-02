import React, { useState } from 'react';
import { X, Bell, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NotificationSettingsModalProps {
    onClose: () => void;
    onSave: (time: string) => void;
    currentTime: string;
}

const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ onClose, onSave, currentTime }) => {
    const [time, setTime] = useState(currentTime || '09:00');
    const { theme } = useTheme();

    const handleSave = () => {
        onSave(time);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all scale-100 border`}>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl">
                            <Bell size={20} />
                        </div>
                        <h3 className="font-bold text-lg">通知設定</h3>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} text-slate-400`}>
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border`}>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Clock size={14} /> 每日提醒時間
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className={`w-full text-2xl font-black text-center rounded-xl py-4 outline-none transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700 focus:border-primary-500 focus:ring-primary-500/10 text-white' : 'bg-white border-slate-200 focus:border-primary-500 focus:ring-primary-50/50 text-slate-800'}`}
                        />
                        <p className="text-xs text-center text-slate-400 mt-2 font-medium">我們將在每天的這個時間發送任務摘要給您</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:shadow-primary-300 transition-all text-sm"
                        >
                            儲存設定
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsModal;
