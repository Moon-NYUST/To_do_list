import axios from 'axios';

export const remindersAPI = {
  get: (user: string) => api.get(`/tasks/personal/reminders/${user}`),
  // New endpoint for bell summary
  getPendingSummary: () => api.get('/tasks/personal/reminders/pending')
};

// ---------------------------------------------------------------------------
// 自動判斷環境 (修改後)
// ---------------------------------------------------------------------------
// 優先讀取環境變數，若無則回退到本地開發位址
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// WebSocket 網址也改為讀取環境變數
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws';

// ---------------------------------------------------------------------------
// Axios 設定
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
});

// 请求拦截器：自动带上 JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 回应拦截器：处理 401 Token 失效
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 清除失效的 token
      localStorage.removeItem('access_token');
      localStorage.removeItem('username');

      // 强制跳回登入页 (支援 HashRouter)
      // 如果您的路由不是 HashRouter，可能需要改用 window.location.href = '/login'
      window.location.hash = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };