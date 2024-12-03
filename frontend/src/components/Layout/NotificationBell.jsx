import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import NotificationList from '../NotificationComponent/NotificationList';
import { eventBus, LOGOUT_EVENT } from '../../utils/eventBus';
import { FaBell } from 'react-icons/fa';
import './NotificationBell.css';

const NotificationBell = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();

  console.log('=== NotificationBell rendu ===');
  console.log('État actuel:', { showNotifications, unreadCount });
  console.log('currentUser:', currentUser?.uid);

  useEffect(() => {
    if (!currentUser) {
      console.log('=== Pas d\'utilisateur connecté, sortie ===');
      return;
    }
  
    console.log('=== Configuration de l\'écoute des notifications ===');
    console.log('currentUser:', currentUser.uid);
  
    // Query pour obtenir uniquement les notifications non lues
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );

    console.log('=== Query configurée ===', {
      collection: 'notifications',
      userId: currentUser.uid,
      read: false
    });
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('=== Mise à jour des notifications ===');
      console.log('Nombre de notifications:', snapshot.docs.length);
      snapshot.docs.forEach(doc => {
        console.log('Notification:', { id: doc.id, ...doc.data() });
      });
      setUnreadCount(snapshot.docs.length);
    }, (error) => {
      console.error('=== Erreur dans l\'écoute des notifications ===', error);
      console.error('Stack trace:', error.stack);
    });
  
    return () => {
      console.log('=== Nettoyage de l\'écoute des notifications ===');
      unsubscribe();
    };
  }, [currentUser]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="notification-bell-container">
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
