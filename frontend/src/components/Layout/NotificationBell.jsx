import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import NotificationList from '../NotificationComponent/NotificationList';
import { eventBus, LOGOUT_EVENT } from '../../utils/eventBus';
import { FaBell } from 'react-icons/fa';
import { ERROR_MESSAGES } from '../../utils/constants';
import './NotificationBell.css';

const NotificationBell = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();
  const [error, setError] = useState('');

  const handleError = (message, error) => {
    const errorMessage = ERROR_MESSAGES[error?.code] || message || 'Une erreur est survenue';
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }
  
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleError('Erreur lors du chargement des notifications', error);
      }
    });
  
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="notification-bell-container">
      {error && <div className="notification-error">{error}</div>}
      <button 
        className="notification-bell-button" 
        onClick={toggleNotifications}
        aria-label="Notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="notifications-dropdown">
          <NotificationList onClose={() => setShowNotifications(false)} />
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
