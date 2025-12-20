import { useState } from 'react';
import { authAPI } from '../api';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); // Clear previous messages

        try {
            if (isRegister) {
                // Register flow
                await authAPI.register(username, password);
                setMessage('註冊成功！請登入。');
                setIsRegister(false);
            } else {
                // Login flow
                const res = await authAPI.login(username, password);
                if (res.data.status === "success") {
                    // 儲存 Token
                    localStorage.setItem('token', res.data.access_token);
                    onLogin(res.data.username);
                } else {
                    setMessage('登入失敗，請檢查帳號密碼');
                }
            }
        } catch (error) {
            console.error(error);
            setMessage(isRegister ? '註冊失敗 (帳號可能已存在)' : '登入失敗 (請檢查伺服器)');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card card">
                <div className="brand" style={{ justifyContent: 'center', marginBottom: '20px' }}>
                    <span className="logo-icon" style={{ fontSize: '3rem' }}>🎯</span>
                </div>
                <h1 className="login-title">TeamSync Pro</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    {isRegister ? '建立您的新帳戶' : '登入以開始協作'}
                </p>

                <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <input
                            type="text"
                            placeholder="使用者名稱"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="密碼"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="primary" style={{ width: '100%', padding: '12px' }}>
                        {isRegister ? '註冊' : '登入'}
                    </button>

                    {message && <div style={{ color: 'var(--warning)', textAlign: 'center', fontSize: '0.9rem' }}>{message}</div>}
                </form>

                <div style={{ marginTop: '20px', fontSize: '0.9rem' }}>
                    {isRegister ? (
                        <span>已有帳號？ <a style={{ color: '#a0aaec', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setIsRegister(false); setMessage(''); }}>前往登入</a></span>
                    ) : (
                        <span>還沒有帳號？ <a style={{ color: '#a0aaec', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setIsRegister(true); setMessage(''); }}>立即註冊</a></span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Login;