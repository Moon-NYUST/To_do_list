
import React, { useState } from 'react';
// Fix: Use namespace import to bypass named export resolution issues
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM as any;
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await api.post('/login', { username, password });
        login(res.data.access_token, res.data.username);
        navigate('/');
      } else {
        await api.post('/register', { username, password });
        setIsLogin(true);
        setError('註冊成功！請登入。');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '發生了一些錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isLogin ? '歡迎回來' : '加入 TeamSync'}
          </h2>
          <p className="text-slate-500 mt-2">
            {isLogin ? '請登入以訪問您的工作區' : '創建一個帳戶來開始使用'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${error.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">用戶名</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all"
              placeholder="例如：王小明"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">密碼</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isLogin ? (
              <><LogIn size={20} /> 登入</>
            ) : (
              <><UserPlus size={20} /> 註冊</>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm transition-colors"
            >
              {isLogin ? "還沒有帳戶？點擊註冊" : "已有帳戶？點擊登入"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
