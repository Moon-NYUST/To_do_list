import React, { useRef, useEffect } from 'react';
import {
    MessageSquare,
    BarChart2,
    History,
    Wifi,
    WifiOff,
    Send,
    FileText,
    Coffee
} from 'lucide-react';

interface TeamLobbyProps {
    lobbyTab: 'chat' | 'stats' | 'log' | 'report';
    onTabChange: (tab: 'chat' | 'stats' | 'log' | 'report') => void;
    messages: any[];
    teamMembers: any[];
    onlineMembers: string[];
    user: string | null;
    theme: 'light' | 'dark';
    newMessage: string;
    setNewMessage: (msg: string) => void;
    onSendMessage: (e: React.FormEvent) => void;
    teamStats: any;
    isTeamWsReady: boolean;
    hasMoreMsgs: boolean;
    isLoadingMore: boolean;
    onFetchMore: () => void;
    readStatuses: any[];
    getAvatarUrl: (url: string | null) => string | null;
    formatMsgTime: (iso: string) => string;
}

const TeamLobby: React.FC<TeamLobbyProps> = ({
    lobbyTab,
    onTabChange,
    messages,
    teamMembers,
    onlineMembers,
    user,
    theme,
    newMessage,
    setNewMessage,
    onSendMessage,
    teamStats,
    isTeamWsReady,
    hasMoreMsgs,
    isLoadingMore,
    onFetchMore,
    readStatuses,
    getAvatarUrl,
    formatMsgTime
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (lobbyTab === 'chat') {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, lobbyTab]);

    return (
        <div className={`w-full h-full flex flex-col rounded-[2rem] shadow-xl border overflow-hidden shrink-0 transition-colors min-w-[320px] ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'
            }`}>
            {/* Header */}
            <div className={`p-4 border-b font-bold flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800 text-slate-300' : 'bg-slate-50/50 border-slate-50 text-slate-700'
                }`}>
                <div className="flex items-center gap-2"><MessageSquare size={18} className="text-primary-500" /> 團隊大廳</div>
                {isTeamWsReady ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-slate-600" />}
            </div>

            {/* Tabs */}
            <div className={`flex items-center gap-1 p-1 rounded-lg mb-4 mx-4 mt-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <button onClick={() => onTabChange('chat')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${lobbyTab === 'chat' ? (theme === 'dark' ? 'bg-slate-700 shadow-sm text-primary-400' : 'bg-white shadow-sm text-primary-600') : 'text-slate-500 hover:text-primary-500'}`}><MessageSquare size={14} /> 聊天</button>
                <button onClick={() => onTabChange('stats')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${lobbyTab === 'stats' ? (theme === 'dark' ? 'bg-slate-700 shadow-sm text-violet-400' : 'bg-white shadow-sm text-violet-600') : 'text-slate-500 hover:text-violet-500'}`}><BarChart2 size={14} /> 貢獻榜</button>
                <button onClick={() => onTabChange('log')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${lobbyTab === 'log' ? (theme === 'dark' ? 'bg-slate-700 shadow-sm text-rose-400' : 'bg-white shadow-sm text-rose-600') : 'text-slate-500 hover:text-rose-500'}`}><History size={14} /> 日誌</button>
                <button onClick={() => onTabChange('report')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${lobbyTab === 'report' ? (theme === 'dark' ? 'bg-slate-700 shadow-sm text-emerald-400' : 'bg-white shadow-sm text-emerald-600') : 'text-slate-500 hover:text-emerald-500'}`}><FileText size={14} /> 報告</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative">
                {lobbyTab === 'chat' && (
                    <>
                        {/* Members List */}
                        <div className="flex -space-x-2 overflow-hidden py-1 px-1 mx-4">
                            {teamMembers.map((m, i) => {
                                const isOnline = onlineMembers.includes(m.username);
                                return (
                                    <div key={i} className="relative">
                                        <div className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold overflow-hidden ${isOnline ? 'border-emerald-500 z-10' : (theme === 'dark' ? 'border-slate-800 bg-slate-800' : 'border-white bg-slate-200')
                                            }`} title={`${m.username} (${isOnline ? '在線' : '離線'})`}>
                                            {m?.avatar ? (
                                                <img src={getAvatarUrl(m.avatar) || ''} alt={m.username} className={`w-full h-full object-cover ${!isOnline ? 'grayscale opacity-40' : ''}`} />
                                            ) : (
                                                <span className={!isOnline ? 'text-slate-500' : ''}>{m.username[0].toUpperCase()}</span>
                                            )}
                                        </div>
                                        {isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full z-20"></div>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 flex flex-col">
                            {hasMoreMsgs && (
                                <div className="text-center py-2">
                                    <button onClick={onFetchMore} disabled={isLoadingMore} className="text-xs text-slate-400 hover:text-primary-500">
                                        {isLoadingMore ? '載入中...' : '載入更多歷史訊息'}
                                    </button>
                                </div>
                            )}
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender === user;
                                const senderInfo = teamMembers.find(m => m.username === msg.sender);
                                const isOnline = onlineMembers.includes(msg.sender);
                                const showTime = idx === 0 || (new Date(msg.timestamp).getTime() - new Date(messages[idx - 1].timestamp).getTime() > 5 * 60 * 1000);
                                return (
                                    <div key={idx} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showTime && <div className="text-[10px] text-slate-400 my-3 text-center w-full">{formatMsgTime(msg.timestamp)}</div>}
                                        <div className={`flex gap-2.5 max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end mb-2`}>
                                            <div className="relative shrink-0 mb-1">
                                                <div className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-bold overflow-hidden shadow-sm ${isOnline ? 'border-emerald-500 bg-white dark:bg-slate-800' : (theme === 'dark' ? 'border-slate-800 bg-slate-800' : 'border-slate-200 bg-slate-100')
                                                    }`} title={msg.sender}>
                                                    {senderInfo?.avatar ? <img src={getAvatarUrl(senderInfo.avatar) || ''} className={`w-full h-full object-cover ${!isOnline ? 'grayscale opacity-50' : ''}`} alt="" /> : <span className={!isOnline ? 'text-slate-500' : 'text-primary-600'}>{msg.sender[0].toUpperCase()}</span>}
                                                </div>
                                                {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>}
                                            </div>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && <span className="text-[10px] text-slate-500 mb-1 ml-1 font-bold">{msg.sender}</span>}
                                                <div
                                                    className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${isMe ? 'bg-primary-600 text-white rounded-br-none' : (theme === 'dark' ? 'bg-slate-800 text-slate-200 rounded-bl-none' : 'bg-white text-slate-700 rounded-bl-none')
                                                        }`}
                                                    draggable
                                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', msg.content)}
                                                >
                                                    {msg.content}
                                                </div>
                                                {msg.id && (
                                                    <div className={`flex items-center gap-0.5 mt-1.5 ${isMe ? 'mr-1 flex-row-reverse' : 'ml-1 flex-row'}`}>
                                                        {readStatuses.filter(s => s.last_read_message_id >= (msg.id as number) && s.username !== msg.sender).map(s => (
                                                            <div key={s.username} className="w-3.5 h-3.5 rounded-full overflow-hidden border border-white dark:border-slate-900 shadow-sm transition-transform hover:scale-110" title={`${s.username} 已讀`}>
                                                                {s.avatar ? <img src={getAvatarUrl(s.avatar) || ''} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-300 flex items-center justify-center text-[6px] font-bold text-slate-600">{s.username[0]}</div>}
                                                            </div>
                                                        ))}
                                                        {readStatuses.some(s => s.last_read_message_id >= (msg.id as number) && s.username !== msg.sender) && <span className="text-[9px] text-slate-400 mx-1 font-medium">已讀</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>

                        <form onSubmit={onSendMessage} className={`p-3 border-t flex gap-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="輸入訊息..." className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all ${theme === 'dark' ? 'bg-slate-900 text-white placeholder-slate-500' : 'bg-slate-50 text-slate-900 placeholder-slate-400'}`} />
                            <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"><Send size={18} /></button>
                        </form>
                    </>
                )}

                {lobbyTab === 'stats' && (
                    <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                        {(() => {
                            const sortedStats = [...(teamStats?.contributions || [])].map(c => ({ ...c, newTotal: (c.main * 2) + c.sub })).sort((a, b) => b.newTotal - a.newTotal);
                            return sortedStats.map((c, i) => (
                                <div key={c.username} className={`p-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</div>
                                            <span className={`font-bold text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{c.username}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-primary-500 leading-none">{c.newTotal} <span className="text-[10px] text-slate-400 font-normal">pts</span></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-bold text-blue-500"><span>主任務 (+2)</span><span>{c.main}</span></div>
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min((c.main / 10) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-bold text-emerald-500"><span>子任務 (+1)</span><span>{c.sub}</span></div>
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min((c.sub / 20) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}

                {lobbyTab === 'log' && (
                    <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                        {teamStats?.logs?.map((log: any) => (
                            <div key={log.id} className="flex gap-3 text-sm">
                                <div className={`mt-1 min-w-[6px] h-1.5 rounded-full ${log.action === 'checked' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <div>
                                    <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <span className="font-bold">{log.user_name}</span> {log.action === 'checked' ? '完成了' : '取消了'} <span className="font-bold underline decoration-slate-300 underline-offset-2">{log.task_title}</span>
                                    </p>
                                    <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString('zh-TW', { hour12: false })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {lobbyTab === 'report' && (
                    <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                        {(!teamStats?.reports || teamStats.reports.length === 0) ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 opacity-50 space-y-2">
                                <FileText size={48} />
                                <p className="text-sm font-bold">目前尚無工作報告</p>
                            </div>
                        ) : (
                            teamStats.reports.map((report: any) => (
                                <div key={report.id} className={`p-5 rounded-[1.5rem] border shadow-sm transition-all ${theme === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-black">
                                                {report.user_name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{report.user_name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(report.clock_out).toLocaleDateString()} {new Date(report.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-slate-900 text-emerald-400' : 'bg-white text-emerald-600'}`}>
                                            專注 {report.work_hours}
                                        </div>
                                    </div>

                                    {report.report_summary && (
                                        <div className={`p-4 rounded-2xl text-xs leading-relaxed italic ${theme === 'dark' ? 'bg-slate-900/50 text-slate-300' : 'bg-white text-slate-600 border border-slate-100'}`}>
                                            「{report.report_summary}」
                                        </div>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {report.completed_tasks?.split(',').filter(Boolean).map((t: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-primary-100 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-[9px] font-bold rounded-lg border border-primary-200/50 dark:border-primary-500/20 leading-none">
                                                ✅ {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamLobby;
