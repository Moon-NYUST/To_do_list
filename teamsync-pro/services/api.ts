import axios from 'axios';

export const remindersAPI = {
  get: (user: string) => api.get(`/tasks/personal/reminders/${user}`),
  // New endpoint for bell summary
  getPendingSummary: () => api.get('/tasks/personal/reminders/pending')
};

// ---------------------------------------------------------------------------
// 自动判断环境
// ---------------------------------------------------------------------------
// 如果是开发模式 (npm run dev)，使用 localhost:8000
// 如果是生产模式 (npm run build 后由 FastAPI 托管)，使用空字串 "" (代表相对路径)
const isDev = import.meta.env.MODE === 'development';

const API_BASE_URL = isDev ? 'http://127.0.0.1:8000' : '';

// WebSocket 网址也需要动态判断
// 生产环境会自动抓取当前的 domain (例如 xxxx.ngrok-free.app) 并把 http 换成 ws
export const WS_BASE_URL = isDev
  ? 'ws://127.0.0.1:8000/ws'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

// ---------------------------------------------------------------------------
// Axios 设定
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