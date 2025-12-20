import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
});

// 自動附加 JWT Token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authAPI = {
    register: (username, password) => api.post('/register', { username, password }),
    login: (username, password) => api.post('/login', { username, password }),
};

export const personalTaskAPI = {
    // 支援排序與時間篩選
    get: (user, sortBy = 'created_at', order = 'asc') =>
        api.get(`/tasks/personal/${user}?sort_by=${sortBy}&order=${order}`),
    add: (task, user) => api.post(`/tasks/personal/?user_name=${user}`, task),
    update: (id, taskData) => api.put(`/tasks/personal/${id}`, taskData),
    delete: (id) => api.delete(`/tasks/personal/${id}`),
    promote: (id, teamName) => api.post(`/tasks/personal/${id}/promote?team_name=${teamName}`), // 新增：轉移任務
};

export const teamTaskAPI = {
    get: (team) => api.get(`/tasks/team/${team}`),
    add: (task, team, creator) => api.post(`/tasks/team/?team_name=${team}&creator=${creator || ''}`, task),
    update: (id, taskData) => api.put(`/tasks/team/${id}`, taskData),
    delete: (id) => api.delete(`/tasks/team/${id}`),
    // 新增：指派成員
    assign: (taskId, userName) => api.post(`/tasks/team/${taskId}/assign`, { user_name: userName })
};

export const attendanceAPI = {
    clockIn: (user) => api.post('/attendance/', { user }),
    clockOut: (user) => api.post('/attendance/clock-out', null, { params: { user } }), // 簽退
    getHistory: (user) => api.get(`/attendance/${user}`),
    getOnlineUsers: () => api.get('/attendance/status/online'), // 新增：取得線上名單
};

export const remindersAPI = {
    get: (user) => api.get(`/tasks/personal/reminders/${user}`),
};
