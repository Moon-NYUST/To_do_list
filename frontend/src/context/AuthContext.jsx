import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Init check
        const storedUser = localStorage.getItem('user_name'); // We don't have this yet, Login.jsx stored token only? 
        // Wait, Login.jsx passed username up. App.jsx stored nothing.
        // Let's improve this: Login stores both or we decode token. Keeping it simple: store user_name too.
        if (storedUser && localStorage.getItem('token')) {
            setUser(storedUser);
        }
    }, []);

    const login = (username, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user_name', username);
        setUser(username);
        toast.success(`歡迎回來, ${username}! 🚀`);
    };

    const logout = () => {
        toast((t) => (
            <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                確定要登出嗎？
                <button onClick={() => {
                    toast.dismiss(t.id);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_name');
                    setUser(null);
                    toast.success("已登出");
                }} style={{ background: 'var(--danger)', border: 'none', padding: '4px 8px', borderRadius: '4px', color: 'white' }}>登出</button>
                <button onClick={() => toast.dismiss(t.id)} style={{ background: 'gray', border: 'none', padding: '4px 8px', borderRadius: '4px', color: 'white' }}>取消</button>
            </span>
        ), { duration: 5000, icon: '👋' });
    };

    // Forced logout without confirm (for API 401)
    const logoutForce = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_name');
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, logoutForce }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
