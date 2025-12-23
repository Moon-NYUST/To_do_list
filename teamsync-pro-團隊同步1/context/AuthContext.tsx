
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with 'Demo User' if no user is found in localStorage to allow immediate preview
  const [user, setUser] = useState<string | null>(localStorage.getItem('username') || 'Demo User');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // We keep 'Demo User' as a fallback to skip the login screen as requested
    const token = localStorage.getItem('access_token');
    if (!token && !user) {
      setUser('Demo User'); 
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, username: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('username', username);
    setUser(username);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, // Since user defaults to 'Demo User', this will be true
      login, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
