import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  History,
  UserCheck,
  TrendingUp,
  Activity,
  AlertTriangle,
  Play,
  Square,
  Loader2,
  ArrowDown,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

interface Attendance {
  id: number;
  user_name: string;
  clock_in: string;
  clock_out: string | null;
  work_hours: string;
}

interface TaskSummaryItem {
  id: string;
  title: string;
  due_time?: string;
  team?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [now, setNow] = useState(new Date());

  // 1. 取得統計資料 (React Query)
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/stats/dashboard');
      return res.data;
    },
    enabled: !!user
  });

  // 2. 取得打卡紀錄 (React Query)
  const { data: history = [], refetch: refetchHistory } = useQuery<Attendance[]>({
    queryKey: ['attendance', user],
    queryFn: async () => {
      const res = await api.get(`/attendance/${user}`);
      return res.data;
    },
    enabled: !!user
  });

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'clocked-in' | 'clocked-out'>('clocked-out');

  // --- 詳情 Modal 狀態 ---
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailData, setDetailData] = useState<{ personal: TaskSummaryItem[], team: TaskSummaryItem[] }>({ personal: [], team: [] });
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchDetail = async (type: 'pending' | 'overdue') => {
    setIsDetailLoading(true);
    setDetailTitle(type === 'pending' ? '待處理任務詳情' : '逾期任務詳情');
    try {
      const res = await api.get(`/stats/tasks/${type}`);
      setDetailData(res.data);
      setShowDetailModal(true);
    } catch (err) {
      alert("載入詳情失敗");
    } finally {
      setIsDetailLoading(false);
    }
  };

  // 同步出勤狀態
  useEffect(() => {
    if (history.length > 0) {
      const isStillIn = !history[0].clock_out;
      setStatus(isStillIn ? 'clocked-in' : 'clocked-out');
    } else {
      setStatus('clocked-out');
    }
  }, [history]);

  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockAction = async () => {
    setIsLoading(true);
    try {
      if (status === 'clocked-out') {
        await api.post('/attendance/', { user });
      } else {
        await api.post(`/attendance/clock-out?user=${user}`);
      }
      refetchHistory();
      refetchStats();
    } catch (err) {
      alert("操作失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* 頂部歡迎詞 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-4xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>你好, {user} 👋</h1>
          <p className="text-slate-500 font-medium mt-1">今天又是高效協作的一天！</p>
        </div>
        <div className={`px-6 py-3 rounded-2xl shadow-sm border flex items-center gap-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">目前時間</p>
            <p className={`text-xl font-mono font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
              {now.toLocaleTimeString('zh-TW', { hour12: false })}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-primary-950/50 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-8 rounded-[2rem] shadow-xl relative overflow-hidden group border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/20' : 'bg-white border-slate-50 shadow-slate-200/50'}`}>
          <div className={`absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            <UserCheck size={80} />
          </div>
          <p className="text-slate-500 font-bold text-sm">出勤狀態</p>
          <div className="mt-4 flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${status === 'clocked-in' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{status === 'clocked-in' ? '工作中' : '已簽退'}</h3>
          </div>
          <button
            onClick={handleClockAction}
            disabled={isLoading}
            className={`mt-6 w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${status === 'clocked-out'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-700'
              : (theme === 'dark' ? 'bg-rose-950/30 text-rose-400 border-2 border-rose-900/30 hover:bg-rose-900/40' : 'bg-rose-50 text-rose-600 border-2 border-rose-100 hover:bg-rose-100')
              }`}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : status === 'clocked-out' ? <><Play size={18} fill="currentColor" /> 上班打卡</> : <><Square size={18} fill="currentColor" /> 下班簽退</>}
          </button>
        </div>

        <div
          onClick={() => fetchDetail('pending')}
          className={`p-8 rounded-[2rem] shadow-xl border cursor-pointer hover:scale-[1.02] transition-all group ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/20' : 'bg-white border-slate-50 shadow-slate-200/50'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors group-hover:bg-primary-500 group-hover:text-white ${theme === 'dark' ? 'bg-amber-950/50 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
            <TrendingUp size={24} />
          </div>
          <p className="text-slate-500 font-bold text-sm">待處理待辦事項</p>
          <h3 className={`text-4xl font-black mt-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{statsData?.pending_tasks_count || 0} <span className="text-lg text-slate-400 font-bold">項</span></h3>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
            查看詳情 <ChevronRight size={14} />
          </div>
        </div>

        <div
          onClick={() => fetchDetail('overdue')}
          className={`p-8 rounded-[2rem] shadow-xl border cursor-pointer hover:scale-[1.02] transition-all group ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/20' : 'bg-white border-slate-50 shadow-slate-200/50'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors group-hover:bg-rose-500 group-hover:text-white ${theme === 'dark' ? 'bg-rose-950/50 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
            <AlertTriangle size={24} />
          </div>
          <p className="text-slate-500 font-bold text-sm">逾期未完成</p>
          <h3 className={`text-4xl font-black mt-2 ${theme === 'dark' ? 'text-rose-500' : 'text-rose-600'}`}>{statsData?.overdue_tasks_count || 0} <span className={`text-lg font-bold ${theme === 'dark' ? 'text-rose-900/50' : 'text-rose-300'}`}>項</span></h3>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
            查看詳情 <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* 打卡歷史紀錄 */}
      <div className={`rounded-[2.5rem] shadow-xl overflow-hidden border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/60'}`}>
        <div className={`p-8 border-b flex justify-between items-center ${theme === 'dark' ? 'border-slate-800' : 'border-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800 text-white border border-slate-700' : 'bg-slate-900 text-white'}`}>
              <History size={20} />
            </div>
            <h2 className={`text-xl font-black tracking-tight ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>最近打卡紀錄</h2>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${theme === 'dark' ? 'text-slate-500 bg-slate-800' : 'text-slate-400 bg-slate-50'}`}>
            <ArrowDown size={12} /> 往下捲動查看更多
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className={`sticky top-0 z-10 shadow-sm ${theme === 'dark' ? 'bg-slate-900/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'}`}>
              <tr>
                <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">日期</th>
                <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">上班時間</th>
                <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">下班時間</th>
                <th className="px-10 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">工作時數</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-50'}`}>
              {history.map((record) => (
                <tr key={record.id} className={`transition-colors group ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'}`}>
                  <td className="px-10 py-7">
                    <p className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{new Date(record.clock_in).toLocaleDateString()}</p>
                  </td>
                  <td className="px-10 py-7">
                    <div className={`flex items-center gap-2 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      {formatTime(record.clock_in)}
                    </div>
                  </td>
                  <td className="px-10 py-7 font-medium">
                    {record.clock_out ? (
                      <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                        <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                        {formatTime(record.clock_out)}
                      </div>
                    ) : (
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-primary-950/50 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                        進行中...
                      </span>
                    )}
                  </td>
                  <td className="px-10 py-7 text-right">
                    <span className={`inline-block px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest ${record.clock_out
                      ? (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                      : (theme === 'dark' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                      }`}>
                      {record.work_hours || '計時中'}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20 text-slate-500">
                      <Activity size={64} />
                      <p className="font-bold text-lg">尚無任何打卡記錄</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 任務詳情 Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className={`px-8 py-6 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{detailTitle}</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
              {/* 個人任務 */}
              <section>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div> 個人待辦
                </h4>
                {detailData.personal.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 italic">目前沒有相關任務</p>
                ) : (
                  <div className="space-y-3">
                    {detailData.personal.map(task => (
                      <div
                        key={task.id}
                        onClick={() => navigate('/tasks/personal')}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer group transition-all ${theme === 'dark' ? 'bg-slate-800/30 border-slate-800 hover:border-primary-500' : 'bg-slate-50/30 border-slate-100 hover:border-primary-300'}`}
                      >
                        <div>
                          <p className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{task.title}</p>
                          {task.due_time && <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock size={10} /> {new Date(task.due_time).toLocaleString()}</p>}
                        </div>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 團隊任務 */}
              <section>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> 團隊指派
                </h4>
                {detailData.team.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 italic">目前沒有相關任務</p>
                ) : (
                  <div className="space-y-3">
                    {detailData.team.map(task => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setShowDetailModal(false);
                          navigate(`/tasks/team?team=${encodeURIComponent(task.team || '')}`);
                        }}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer group transition-all ${theme === 'dark' ? 'bg-slate-800/30 border-slate-800 hover:border-rose-500' : 'bg-slate-50/30 border-slate-100 hover:border-rose-300'}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded leading-none uppercase">{task.team}</span>
                            <p className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{task.title}</p>
                          </div>
                          {task.due_time && <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock size={10} /> {new Date(task.due_time).toLocaleString()}</p>}
                        </div>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className={`p-6 border-t ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`w-full py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;