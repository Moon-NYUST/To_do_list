import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
// 請確認您的元件路徑，如果是在 pages 資料夾請自行調整 (例如 './pages/Login')
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PersonalTasks from './pages/PersonalTasks';
import TeamWorkspace from './pages/TeamWorkspace';
import Layout from './components/Layout';

// 保護路由元件: 沒登入就踢回 Login
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth(); // 確保這裡使用的是您 AuthContext 提供的 token 或 isAuthenticated 狀態
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公開頁面 */}
          <Route path="/login" element={<Login />} />
          
          {/* --- 受保護頁面 (需登入) --- */}

          {/* 1. 儀表板 */}
          <Route path="/" element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } />

          {/* 2. 個人任務 (對應 Layout 的連結 /tasks/personal) */}
          <Route path="/tasks/personal" element={
            <PrivateRoute>
              <Layout>
                <PersonalTasks />
              </Layout>
            </PrivateRoute>
          } />

          {/* 3. 團隊任務 (對應 Layout 的連結 /tasks/team) */}
          <Route path="/tasks/team" element={
            <PrivateRoute>
              <Layout>
                <TeamWorkspace />
              </Layout>
            </PrivateRoute>
          } />

          {/* 4. 未知路徑導回首頁 */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;