import { useState, useEffect } from 'react';
import Login from './components/Login';
import PersonalTasks from './components/PersonalTasks';
import TeamTasks from './components/TeamTasks';
import ChatRoom from './components/ChatRoom';
import Attendance from './components/Attendance';
import { attendanceAPI, remindersAPI } from './api';
import './App.css';
import { Toaster, toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, login } = useAuth(); // Use Context
  const [activeTask, setActiveTask] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Check reminders only when user changes
  useEffect(() => {
    if (!user) return;
    checkReminders(user);

    // Online status polling
    const fetchOnline = async () => {
      try {
        const res = await attendanceAPI.getOnlineUsers();
        setOnlineUsers(res.data.online_users || []);
      } catch (e) { console.error(e); }
    };
    fetchOnline();
    const timer = setInterval(fetchOnline, 30000);
    return () => clearInterval(timer);
  }, [user]);

  const checkReminders = async (username) => {
    try {
      const res = await remindersAPI.get(username);
      if (res.data && res.data.length > 0) {
        toast(`您有 ${res.data.length} 項任務即將到期`, {
          icon: '📅',
          style: { border: '1px solid #713200', padding: '16px', color: '#713200' },
        });
      }
    } catch (err) { console.error(err); }
  };

  const { logout } = useAuth();

  if (!user) return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      {/* Pass login context handler */}
      <Login onLogin={(name) => login(name, localStorage.getItem('token'))} />
    </>
  );

  return (
    <div className="dashboard-wrapper">
      <Toaster position="top-right" toastOptions={{ style: { background: 'rgba(30,30,50,0.9)', color: '#fff', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' } }} />

      <header className="dashboard-header">
        <div className="brand">
          <span className="logo-icon">🎯</span>
          <h1>TeamSync Pro</h1>
        </div>
        <div className="header-actions">
          <div className="user-badge">
            <span className="dot"></span>
            {user}
          </div>
          <button onClick={logout} className="btn-logout">登出</button>
        </div>
      </header>

      <div className="dashboard-content">
        <aside className="content-left">
          <Attendance currentUser={user} />
          <div className="card" style={{ gap: '10px' }}>
            <h4>🌐 線上成員 ({onlineUsers.length})</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {onlineUsers.map(u => (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  key={u} className="status-badge online"
                >
                  {u}
                </motion.span>
              ))}
            </div>
          </div>
        </aside>

        <main className="content-main">
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '0 10px', marginBottom: '-10px' }}
          >
            <h2 style={{ margin: 0, fontSize: '1.5rem', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Good Morning, {user}! ☀️
            </h2>
          </motion.div>

          <div className="section-group">
            <PersonalTasks currentUser={user} />
          </div>

          <div className="section-group">
            <TeamTasks
              currentUser={user}
              onSelectTask={setActiveTask}
              onlineUsers={onlineUsers}
            />
          </div>
        </main>

        <aside className="content-right">
          {activeTask ? (
            <ChatRoom
              currentUser={user}
              taskId={activeTask.id}
              taskTitle={activeTask.title}
              onClose={() => setActiveTask(null)}
            />
          ) : (
            <div className="card" style={{ height: '300px', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
              <span style={{ fontSize: '3rem' }}>💬</span>
              <p>點擊團隊任務以開啟聊天室</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;