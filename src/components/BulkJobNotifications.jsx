import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../api';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3000';

export default function BulkJobNotifications() {
    const [jobs, setJobs] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchJobs = async () => {
        try {
            const res = await api.get('/bulk-notifications');
            if (res.success) {
                setJobs(res.data);
                setUnreadCount(res.data.filter(j => j.status !== 'done' && j.status !== 'completed_with_errors' && j.status !== 'failed').length);
            }
        } catch (err) {
            console.error('Failed to fetch bulk notifications:', err);
        }
    };

    useEffect(() => {
        fetchJobs();

        // Check if there is a way to pass auth token.
        // Assuming session is handled via cookies by the backend.
        const socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket']
            // Note: If backend requires token in handshake, add it here:
            // auth: { token: localStorage.getItem('token') }
        });

        socket.on('bulk_progress', (data) => {
            setJobs(prev => {
                const existing = prev.find(j => j.jobId === data.jobId);
                if (existing) {
                    return prev.map(j => j.jobId === data.jobId ? { ...j, ...data } : j);
                }
                return [data, ...prev];
            });
        });

        socket.on('bulk_complete', (data) => {
            setJobs(prev => {
                const existing = prev.find(j => j.jobId === data.jobId);
                if (existing) {
                    return prev.map(j => j.jobId === data.jobId ? { ...j, ...data } : j);
                }
                return [data, ...prev];
            });
            setUnreadCount(c => c + 1);
            // Optionally show a toast notification here
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleDismiss = async (jobId) => {
        try {
            const res = await api.delete(`/bulk-notifications/${jobId}`);
            if (res.success) {
                setJobs(prev => prev.filter(j => j.jobId !== jobId));
            }
        } catch (err) {
            console.error('Failed to dismiss notification:', err);
        }
    };

    const togglePanel = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0);
        }
    };

    return (
        <div className="relative">
            <button 
                onClick={togglePanel}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                title="Bulk Upload Notifications"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-800">Upload Notifications</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                        {jobs.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">
                                No recent uploads.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {jobs.map(job => (
                                    <div key={job.jobId} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                                    job.status === 'done' || job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    job.status === 'completed_with_errors' ? 'bg-amber-100 text-amber-700' :
                                                    job.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700 animate-pulse'
                                                }`}>
                                                    {job.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => handleDismiss(job.jobId)}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                                title="Dismiss"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        
                                        <div className="mb-2">
                                            <p className="text-xs font-bold text-gray-800 uppercase">{job.type.replace('_', ' ')}</p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-1">{job.jobId}</p>
                                        </div>
                                        
                                        <div className="bg-white border border-gray-100 rounded-lg p-2 flex justify-between text-xs text-center shadow-sm">
                                            <div>
                                                <p className="text-gray-400 mb-1">Total</p>
                                                <p className="font-bold text-gray-800">{job.totalRows || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 mb-1">Success</p>
                                                <p className="font-bold text-green-600">{job.processedRows || job.successCount || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 mb-1">Errors</p>
                                                <p className="font-bold text-red-600">{job.failedRows || job.errorCount || 0}</p>
                                            </div>
                                        </div>

                                        {job.errors && job.errors.length > 0 && (
                                            <div className="mt-3">
                                                <details className="text-xs">
                                                    <summary className="text-amber-600 font-semibold cursor-pointer outline-none select-none hover:text-amber-700">
                                                        View {job.errors.length} Errors
                                                    </summary>
                                                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto pr-1">
                                                        {job.errors.map((e, idx) => (
                                                            <div key={idx} className="bg-red-50 text-red-800 p-2 rounded border border-red-100">
                                                                <span className="font-bold block mb-1">Row {e.rowNumber || e.row} {e.identifier ? `- ${e.identifier}` : ''}</span>
                                                                <span className="opacity-90">{e.message}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
