
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: string | null;
  avatar: string | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string, avatar?: string) => void;
  updateAvatar: (newAvatar: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(localStorage.getItem('username'));
  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem('avatar'));
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial state
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('username');
    const storedAvatar = localStorage.getItem('avatar');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      setAvatar(storedAvatar);
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, username: string, userAvatar?: string) => {
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('username', username);
    if (userAvatar) localStorage.setItem('avatar', userAvatar);
    setToken(newToken);
    setUser(username);
    if (userAvatar) setAvatar(userAvatar);
  };

  const updateAvatar = (newAvatar: string) => {
    localStorage.setItem('avatar', newAvatar);
    setAvatar(newAvatar);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('avatar');
    setToken(null);
    setUser(null);
    setAvatar(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      avatar,
      token,
      isAuthenticated: !!token,
      login,
      updateAvatar,
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
