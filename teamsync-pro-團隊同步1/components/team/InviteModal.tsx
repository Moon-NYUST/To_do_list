import React from 'react';
import { X } from 'lucide-react';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (e: React.FormEvent) => void;
    inviteUsername: string;
    setInviteUsername: (name: string) => void;
    isSubmitting: boolean;
    theme: 'light' | 'dark';
}

const InviteModal: React.FC<InviteModalProps> = ({
    isOpen,
    onClose,
    onInvite,
    inviteUsername,
    setInviteUsername,
    isSubmitting,
    theme
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'
                }`}>
                <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                    <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        邀請新成員
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <form onSubmit={onInvite} className="p-6 space-y-4">
                    <div>
                        <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            使用者名稱
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={inviteUsername}
                            onChange={e => setInviteUsername(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500/50 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                            placeholder="輸入對方帳號..."
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
                            disabled={!inviteUsername || isSubmitting}
                            className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg shadow-primary-500/30 font-bold"
                        >
                            {isSubmitting ? '邀請中...' : '發送邀請'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteModal;
