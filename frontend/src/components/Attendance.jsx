import { useState, useEffect } from 'react';
import { attendanceAPI } from '../api';

function Attendance({ currentUser, onLogout }) {
    const [history, setHistory] = useState([]);
    const [isClockedIn, setIsClockedIn] = useState(false);

    useEffect(() => {
        if (currentUser) {
            fetchHistory();
        }
    }, [currentUser]);

    const fetchHistory = async () => {
        try {
            const res = await attendanceAPI.getHistory(currentUser);
            setHistory(res.data);

            // 檢查最後一筆紀錄是否尚未簽退，來決定按鈕狀態
            const lastRecord = res.data[res.data.length - 1];
            if (lastRecord && !lastRecord.clock_out) {
                setIsClockedIn(true);
            } else {
                setIsClockedIn(false);
            }
        } catch (error) {
            console.log("尚無打卡紀錄");
            setHistory([]);
        }
    };

    const handleClockIn = async () => {
        try {
            await attendanceAPI.clockIn(currentUser);
            alert("上班打卡成功！☀️");
            fetchHistory();
        } catch (error) {
            alert(error.response?.data?.detail || "打卡失敗");
        }
    };

    const handleClockOut = async () => {
        try {
            await attendanceAPI.clockOut(currentUser);
            alert("下班簽退成功！🌙");
            fetchHistory();
        } catch (error) {
            alert("簽退失敗 ❌");
        }
    };

    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: 'var(--success)' }}>⏰ 考勤系統</h3>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {!isClockedIn ? (
                    <button onClick={handleClockIn} className="primary" style={{ flex: 1, background: 'var(--success)' }}>
                        打卡上班
                    </button>
                ) : (
                    <button onClick={handleClockOut} className="primary" style={{ flex: 1, background: 'var(--danger)' }}>
                        下班簽退
                    </button>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <h4 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    歷史紀錄 <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(工時計算)</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {history.length === 0 ? (
                        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>暫無紀錄</p>
                    ) : (
                        history.map((record, index) => (
                            <div key={index} style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '8px 12px', background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px', fontSize: '0.9rem'
                            }}>
                                <span>{new Date(record.clock_in).toLocaleDateString()}</span>
                                <span style={{ color: record.clock_out ? 'inherit' : 'var(--warning)', fontWeight: 'bold' }}>
                                    {record.work_hours || "進行中"}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Attendance;
