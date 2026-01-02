import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Minus, ChevronRight } from 'lucide-react';
import api, { API_BASE_URL, WS_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface Message {
    id: number;
    sender: string;
    content: string;
    timestamp: string;
}

interface DraggableChatProps {
    taskId: string;
    taskTitle: string;
    onClose: () => void;
    initialPosition?: { x: number, y: number };
    members?: { username: string; avatar: string | null }[];
}

const DraggableChat: React.FC<DraggableChatProps> = ({ taskId, taskTitle, onClose, initialPosition = { x: 100, y: 100 }, members = [] }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [position, setPosition] = useState(initialPosition);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const wsRef = useRef<WebSocket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages();
        setupWebSocket();
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [taskId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isMinimized]);

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/ws/history/${taskId}?limit=50&offset=0`);
            // API returns messages sorted ASC for frontend, but history endpoint might need reversal if it follows pagination logic
            setMessages(res.data);
        } catch (err) {
            console.error("Fetch messages failed:", err);
        }
    };

    const setupWebSocket = () => {
        const currentUsername = typeof user === 'string' ? user : (user as any)?.username || '';
        const base = WS_BASE_URL.endsWith('/') ? WS_BASE_URL.slice(0, -1) : WS_BASE_URL;
        const wsUrl = `${base}/${taskId}?username=${currentUsername}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'CHAT') {
                setMessages(prev => [...prev, data.message]);
            } else {
                // Handle regular message format
                setMessages(prev => [...prev, data]);
            }
        };
        wsRef.current = ws;
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !wsRef.current) return;
        // Send plain text, not JSON object
        wsRef.current.send(newMessage.trim());
        setNewMessage('');
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            // Boundary check (optional but good)
            const newX = Math.max(0, Math.min(window.innerWidth - (isMinimized ? 240 : 320), e.clientX - dragStartRef.current.x));
            const newY = Math.max(0, Math.min(window.innerHeight - (isMinimized ? 56 : 450), e.clientY - dragStartRef.current.y));

            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isMinimized]);

    return (
        <div
            className={`fixed z-[100] flex flex-col shadow-2xl rounded-2xl border overflow-hidden transition-[height,width] duration-300 ease-out ${isMinimized ? 'h-14 w-60' : 'h-[450px] w-80'} ${theme === 'dark' ? 'bg-slate-900 border-slate-700 shadow-black/60' : 'bg-white border-slate-300 shadow-slate-400/50'}`}
            style={{ left: position.x, top: position.y }}
        >
            <div
                className={`p-4 flex items-center justify-between cursor-move select-none ${theme === 'dark' ? 'bg-slate-800 text-white border-b border-slate-700' : 'bg-primary-600 text-white'}`}
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 font-bold truncate pr-4">
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate text-xs tracking-tight">{taskTitle}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/20 rounded transition-colors">
                        <Minus size={14} />
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-2">
                                <MessageSquare size={32} />
                                <p className="text-[10px] font-bold">尚無討論內容</p>
                            </div>
                        )}
                        {messages.map((msg, i) => {
                            const formatTime = (timestamp: string) => {
                                if (!timestamp) return '';
                                try {
                                    return new Date(timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
                                } catch {
                                    return '';
                                }
                            };

                            const senderMember = members.find(m => m.username === msg.sender);
                            const getAvatarUrl = (url: string | null) => {
                                if (!url) return null;
                                if (url.startsWith('http') || url.startsWith('data:')) return url;
                                return `${API_BASE_URL}${url}`;
                            };

                            return (
                                <div key={i} className={`flex items-end gap-2 ${msg.sender === user ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 shrink-0 mb-1">
                                        {senderMember?.avatar ? (
                                            <img src={getAvatarUrl(senderMember.avatar) || ''} alt={msg.sender} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                {msg.sender[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`flex flex-col flex-1 min-w-0 ${msg.sender === user ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[9px] text-slate-500 font-black mb-1 px-1">{msg.sender === user ? 'YOU' : msg.sender}</span>
                                        <div
                                            draggable="true"
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/plain', msg.content);
                                                e.dataTransfer.effectAllowed = 'copy';
                                                e.stopPropagation(); // 防止觸發 DraggableChat 的拖曳
                                            }}
                                            className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] break-words font-medium shadow-sm cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-offset-1 hover:ring-primary-300 transition-all ${msg.sender === user ? 'bg-primary-600 text-white rounded-tr-none' : (theme === 'dark' ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' : 'bg-slate-100 text-slate-700 rounded-tl-none')}`}
                                        >
                                            {msg.content}
                                        </div>
                                        {msg.timestamp && (
                                            <span className="text-[8px] text-slate-400 mt-1 px-1">{formatTime(msg.timestamp)}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <form onSubmit={handleSend} className={`p-3 border-t flex gap-2 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="輸入訊息..."
                            className={`flex-1 px-4 py-2 text-xs rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-white border-slate-200 text-slate-700 focus:border-primary-500 shadow-inner'}`}
                        />
                        <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-primary-500/30">
                            <Send size={16} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
};

export default DraggableChat;
