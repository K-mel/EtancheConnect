import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { requestNotificationPermission, onMessageListener } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { eventBus, LOGOUT_EVENT } from '../../utils/eventBus';
import { ERROR_MESSAGES } from '../../utils/constants';
import './NotificationList.css';

const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);
  const { currentUser } = useAuth();
  const [currentUnsubscribe, setCurrentUnsubscribe] = useState(null);
  const [error, setError] = useState('');

  const handleError = (message, error) => {
    const errorMessage = ERROR_MESSAGES[error?.code] || message || 'Une erreur est survenue';
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  useEffect(() => {
    let isMounted = true;

    const handleLogout = () => {
      if (currentUnsubscribe) {
        currentUnsubscribe();
        setCurrentUnsubscribe(null);
      }
      setNotifications([]);
    };

    eventBus.on(LOGOUT_EVENT, handleLogout);

    const initializeNotifications = async () => {
      try {
        if (!currentUser) {
          handleLogout();
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && isMounted) {
          const userRole = userDoc.data().role;
          await requestNotificationPermission(currentUser.uid, userRole);
        }

        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
          if (isMounted) {
            const newNotifications = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setNotifications(newNotifications);
          }
        }, (error) => {
          if (error.code !== 'permission-denied' && isMounted) {
            handleError('Erreur lors du chargement des notifications', error);
          }
        });

        setCurrentUnsubscribe(() => unsub);

        const messageListener = onMessageListener()
          .then(payload => {
            if (isMounted) {
              setNotifications(prev => [payload, ...prev]);
            }
          })
          .catch(error => {
            if (isMounted) {
              handleError('Erreur lors de l\'écoute des notifications push', error);
            }
          });

        return () => unsub();
      } catch (error) {
        if (isMounted) {
          handleError('Erreur lors de l\'initialisation des notifications', error);
        }
      }
    };

    initializeNotifications();

    return () => {
      isMounted = false;
      eventBus.off(LOGOUT_EVENT, handleLogout);
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }
    };
  }, [currentUser]);

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      handleError('Erreur lors du marquage de la notification comme lue', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  };

  const renderNotificationContent = (notification) => {
    switch (notification.type) {
      case 'NEW_MESSAGE':
        return (
          <div className="notification-item message">
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
          </div>
        );
      case 'PENDING_MESSAGE':
        return (
          <div className="notification-item pending-message">
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
          </div>
        );
      case 'QUOTE_REQUEST_VALIDATION':
        return (
          <div className="notification-item quote-request-validation">
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
          </div>
        );
      case 'QUOTE_VALIDATION':
        return (
          <div className="notification-item quote-validation">
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
          </div>
        );
      default:
        return (
          <div className="notification-item default">
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
          </div>
        );
    }
  };

  return (
    <div className="notifications-container">
      <h3>Notifications</h3>
      {error && <div className="notification-error">{error}</div>}
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <p>Aucune notification</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-wrapper ${notification.read ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notification)}
            >
              {renderNotificationContent(notification)}
              <span className="notification-time">
                {notification.createdAt?.toDate().toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationList;
