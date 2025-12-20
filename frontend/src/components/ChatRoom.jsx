import { useState, useEffect, useRef } from 'react';

function ChatRoom({ currentUser, taskId, taskTitle, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('🔴 未連線');
    const ws = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!taskId) return;

        // 切換任務時，先清空舊的訊息歷史 (確保視覺上是新的聊天室)
        setMessages([]);

        // 建立 WebSocket 連線 (帶上 username)
        ws.current = new WebSocket(`ws://localhost:8000/ws/${taskId}?username=${currentUser}`);

        ws.current.onopen = () => setStatus('🟢 連線中');
        ws.current.onmessage = (e) => setMessages(prev => [...prev, e.data]);
        ws.current.onclose = () => setStatus('🔴 已中斷');

        return () => ws.current?.close();
    }, [taskId, currentUser]); // 依賴 taskId 和 currentUser 變化

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = () => {
        if (ws.current?.readyState === WebSocket.OPEN && input.trim()) {
            ws.current.send(`${currentUser}:${input}`);
            setInput('');
        }
    };

    return (
        <div className="chat-window card">
            <div className="chat-header">
                <div className="chat-info">
                    <h4 style={{ margin: 0 }}>💬 {taskTitle || "聊天室"}</h4>
                    <span className="status-text">{status}</span>
                </div>
                <button className="btn-close-chat" onClick={onClose}>✕</button>
            </div>

            <div className="chat-body">
                {messages.map((msg, i) => {
                    const [sender, content] = msg.includes(':') ? msg.split(':') : ["System", msg];
                    const isMe = sender === currentUser;
                    return (
                        <div key={i} className={`msg-bubble-wrapper ${isMe ? 'me' : 'other'}`}>
                            {!isMe && <div className="msg-sender">{sender}</div>}
                            <div className="msg-bubble">{content}</div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            <div className="chat-footer">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="輸入訊息..."
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                />
                <button className="primary" onClick={handleSend} disabled={status.includes('🔴')}>送出</button>
            </div>
        </div>
    );
}

export default ChatRoom;