import React from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = '確定',
    cancelText = '取消',
    type = 'danger'
}) => {
    const { theme } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className={`w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                    }`}
            >
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${type === 'danger'
                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                                : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                            }`}>
                            {type === 'danger' ? <AlertTriangle size={28} /> : <Info size={28} />}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                {title}
                            </h3>
                            <p className="text-slate-500 text-xs font-medium mt-1">需要您的確認</p>
                        </div>
                    </div>

                    <p className={`text-sm leading-relaxed mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className={`flex-1 py-4 rounded-2xl font-bold transition-all ${theme === 'dark'
                                    ? 'text-slate-400 hover:bg-slate-800'
                                    : 'text-slate-500 hover:bg-slate-100 border border-slate-100'
                                }`}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 py-4 rounded-2xl text-white font-bold shadow-xl transition-all active:scale-95 ${type === 'danger'
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                                    : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
