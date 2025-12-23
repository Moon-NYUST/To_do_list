
import React from 'react';
// Fix: Use namespace import to bypass named export resolution issues
import * as ReactRouterDOM from 'react-router-dom';
const { HashRouter: Router, Routes, Route, Navigate } = ReactRouterDOM as any;
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PersonalTasks from './pages/PersonalTasks';
import TeamWorkspace from './pages/TeamWorkspace';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/tasks" element={
            <PrivateRoute>
              <PersonalTasks />
            </PrivateRoute>
          } />

          <Route path="/teams" element={
            <PrivateRoute>
              <TeamWorkspace />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
