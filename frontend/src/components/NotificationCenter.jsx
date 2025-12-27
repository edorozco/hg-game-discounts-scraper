import React, { useState, useEffect, useRef } from 'react';
import { getLogs, clearLogs } from '../services/api';
import './NotificationCenter.css';

function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastTimestampRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    // Initial load
    fetchLogs();

    // Start polling for new logs
    pollingIntervalRef.current = setInterval(() => {
      fetchLogs();
    }, 2000); // Poll every 2 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await getLogs(50);
      
      if (data.logs) {
        setLogs(data.logs);
        
        // Calculate unread count
        if (lastTimestampRef.current) {
          const unread = data.logs.filter(
            log => log.timestamp > lastTimestampRef.current
          ).length;
          setUnreadCount(unread);
        } else {
          // First load, mark all as read
          lastTimestampRef.current = data.logs[0]?.timestamp || new Date().toISOString();
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Mark all as read when opening
      if (logs.length > 0) {
        lastTimestampRef.current = logs[0].timestamp;
        setUnreadCount(0);
      }
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearLogs();
      setLogs([]);
      setUnreadCount(0);
      lastTimestampRef.current = null;
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  };

  return (
    <div className="notification-center">
      <button 
        className="notification-icon-button"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <span className="notification-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              <button 
                className="clear-button"
                onClick={handleClearLogs}
                title="Clear all logs"
              >
                Clear
              </button>
              <button 
                className="close-button"
                onClick={handleToggle}
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="notification-list">
            {logs.length === 0 ? (
              <div className="no-notifications">
                No notifications yet
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`notification-item notification-${log.type}`}
                >
                  <div className="notification-icon-type">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">{log.message}</div>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      {log.metadata?.platform && (
                        <span className="notification-platform">
                          {log.metadata.platform.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;

