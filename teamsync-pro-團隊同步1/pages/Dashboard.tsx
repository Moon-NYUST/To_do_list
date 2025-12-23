import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';

interface Attendance {
  id: number;
  user_name: string;
  clock_in: string;
  clock_out?: string;
  work_hours?: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [history, setHistory] = useState<Attendance[]>([]);
  const [status, setStatus] = useState<'clocked-in' | 'clocked-out'>('clocked-out');
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  // [新增] 格式化時間的 Helper function (解決時區問題)
  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    // 如果後端回傳的是 "2023-10-27T10:00:00" (無 Z)，視為 UTC
    // 如果有 Z 則自動會轉，這裡統一補上 Z 以防萬一 (若後端沒存時區資訊)
    const date = new Date(isoString.endsWith('Z') ? isoString : isoString + 'Z');
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // [新增] 格式化日期的 Helper
  const formatDate = (isoString: string) => {
    if (!isoString) return '---';
    const date = new Date(isoString.endsWith('Z') ? isoString : isoString + 'Z');
    return date.toLocaleDateString();
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/attendance/${user}`);
      const sortedData = res.data.sort((a: Attendance, b: Attendance) => 
        new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
      );
      setHistory(sortedData);

      const latestRecord = sortedData[0];
      const isActive = latestRecord && !latestRecord.clock_out;
      setStatus(isActive ? 'clocked-in' : 'clocked-out');
    } catch (err) {
      console.error("無法獲取考勤記錄", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats/dashboard');
      setPendingTasksCount(res.data.pending_personal_tasks);
      setOverdueCount(res.data.total_overdue);
    } catch (err) {
      console.error("無法獲取統計數據", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchStats();
    }
    const timer = setInterval(() => {
        setNow(new Date());
    }, 60000); 

    return () => clearInterval(timer);
  }, [user]);

  const handleClockIn = async () => {
    setIsLoading(true);
    try {
      await api.post('/attendance/', { user });
      await fetchHistory(); 
    } catch (err) {
      alert('打卡失敗，請檢查網路連線');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsLoading(true);
    try {
      await api.post(`/attendance/clock-out?user=${user}`);
      await fetchHistory(); 
    } catch (err) {
      alert('下班打卡失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTodayTotalHours = () => {
    if (!history.length) return '0h 0m';
    
    // 這裡比較日期時，也要確保用當地的日期字串
    const todayStr = now.toLocaleDateString(); 
    let totalMilliseconds = 0;

    history.forEach(record => {
        // 將紀錄的時間轉為當地時間物件
        const recordDate = new Date(record.clock_in.endsWith('Z') ? record.clock_in : record.clock_in + 'Z');
        
        if (recordDate.toLocaleDateString() === todayStr) {
            const startTime = recordDate.getTime();
            let endTime;

            if (record.clock_out) {
                const outDate = new Date(record.clock_out.endsWith('Z') ? record.clock_out : record.clock_out + 'Z');
                endTime = outDate.getTime();
            } else {
                endTime = now.getTime();
            }

            totalMilliseconds += (endTime - startTime);
        }
    });

    const totalMinutes = Math.floor(totalMilliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. 數據卡片區域 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            {status === 'clocked-in' && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">今日累積工時</h3>
            <p className="text-4xl font-black text-slate-800 tracking-tighter">
                {calculateTodayTotalHours()}
            </p>
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center">
              <Activity size={24} />
            </div>
          </div>
          <div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">待處理個人任務</h3>
            <p className="text-4xl font-black text-slate-800 tracking-tighter">
              {pendingTasksCount}
            </p>
          </div>
        </div>

        <div className={`glass-card p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 ${overdueCount > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${overdueCount > 0 ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-red-500/10 text-red-600'}`}>
              <AlertTriangle size={24} />
            </div>
          </div>
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-1 ${overdueCount > 0 ? 'text-red-500' : 'text-slate-500'}`}>逾期重要事項</h3>
            <p className={`text-4xl font-black tracking-tighter ${overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {overdueCount > 9 ? overdueCount : `0${overdueCount}`}
            </p>
          </div>
        </div>
      </div>

      {/* 2. 主打卡橫幅區域 */}
      <div className={`p-10 rounded-[2.5rem] border overflow-hidden relative ${
        status === 'clocked-in' ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-900 border-slate-800'
      } text-white shadow-2xl transition-all duration-500`}>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-8 text-center md:text-left">
            <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center ${
              status === 'clocked-in' ? 'bg-white/20' : 'bg-indigo-600'
            } backdrop-blur-md shadow-inner transition-colors duration-500`}>
              {status === 'clocked-in' ? <UserCheck size={40} className="text-white" /> : <Clock size={40} className="text-white" />}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-2">
                {status === 'clocked-in' ? '工作進行中' : '準備好開始了嗎？'}
              </h2>
              <p className="text-indigo-100/70 font-medium text-lg">
                {status === 'clocked-in' ? '專注於當前目標，完成後別忘了打卡下班。' : `歡迎回來，${user}。請打卡記錄您的上班時間。`}
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            {status === 'clocked-out' ? (
              <button
                onClick={handleClockIn}
                disabled={isLoading}
                className="group relative flex items-center justify-center gap-3 w-full md:w-auto px-12 py-5 bg-white text-slate-900 font-extrabold rounded-2xl shadow-2xl hover:bg-slate-50 transition-all disabled:opacity-50 overflow-hidden"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Play fill="currentColor" size={20} className="group-hover:scale-110 transition-transform" />}
                <span className="relative z-10">{isLoading ? '處理中...' : '打卡上班'}</span>
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                disabled={isLoading}
                className="group flex items-center justify-center gap-3 w-full md:w-auto px-12 py-5 bg-transparent border-2 border-white/30 hover:border-white hover:bg-white/10 text-white font-extrabold rounded-2xl transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Square fill="currentColor" size={20} className="group-hover:scale-90 transition-transform" />}
                <span>{isLoading ? '處理中...' : '結束工作'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 歷史紀錄表格 */}
      <div className="glass-card rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">考勤記錄</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Attendance Log</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <th className="px-10 py-5">Date</th>
                <th className="px-10 py-5">Clock In</th>
                <th className="px-10 py-5">Clock Out</th>
                <th className="px-10 py-5 text-right">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-10 py-6 font-bold text-slate-700">
                    {formatDate(record.clock_in)}
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      {formatTime(record.clock_in)}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-slate-600 font-medium">
                    {record.clock_out ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                        {formatTime(record.clock_out)}
                      </div>
                    ) : (
                      <span className="text-indigo-400 text-xs font-bold px-2 py-1 bg-indigo-50 rounded-md">工作中</span>
                    )}
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      record.clock_out 
                        ? 'bg-slate-100 text-slate-600' 
                        : 'bg-green-100 text-green-600 border border-green-200 animate-pulse'
                    }`}>
                      {record.work_hours || '進行中'}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <History size={64} />
                      <p className="font-bold">尚無任何打卡記錄</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;