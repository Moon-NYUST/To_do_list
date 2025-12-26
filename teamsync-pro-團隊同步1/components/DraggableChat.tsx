import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Minus, ChevronRight } from 'lucide-react';
import api from '../services/api';
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
}

const DraggableChat: React.FC<DraggableChatProps> = ({ taskId, taskTitle, onClose, initialPosition = { x: 100, y: 100 } }) => {
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
            const res = await api.get(`/chat/history/${taskId}?limit=50&offset=0`);
            // API returns messages sorted ASC for frontend, but history endpoint might need reversal if it follows pagination logic
            setMessages(res.data);
        } catch (err) {
            console.error("Fetch messages failed:", err);
        }
    };

    const setupWebSocket = () => {
        const wsUrl = `${api.defaults.baseURL?.replace('http', 'ws')}/ws/chat/${taskId}/${user}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'CHAT') {
                setMessages(prev => [...prev, data.message]);
            }
        };
        wsRef.current = ws;
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !wsRef.current) return;
        wsRef.current.send(JSON.stringify({ content: newMessage.trim() }));
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
            className={`fixed z-[100] flex flex-col shadow-2xl rounded-2xl border overflow-hidden transition-[height,width] duration-300 ease-out ${isMinimized ? 'h-14 w-60' : 'h-[450px] w-80'} ${theme === 'dark' ? 'bg-slate-900 border-slate-700 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200/50'}`}
            style={{ left: position.x, top: position.y }}
        >
            <div
                className={`p-4 flex items-center justify-between cursor-move select-none ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-primary-600 text-white'}`}
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
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.sender === user ? 'items-end' : 'items-start'}`}>
                                <span className="text-[9px] text-slate-500 font-black mb-1 px-1">{msg.sender === user ? 'YOU' : msg.sender}</span>
                                <div className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] break-words font-medium shadow-sm ${msg.sender === user ? 'bg-primary-600 text-white rounded-tr-none' : (theme === 'dark' ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' : 'bg-slate-100 text-slate-700 rounded-tl-none')}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
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
