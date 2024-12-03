import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { requestNotificationPermission, onMessageListener } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { eventBus, LOGOUT_EVENT } from '../../utils/eventBus';
import './NotificationList.css';

const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);
  const { currentUser } = useAuth();
  const [currentUnsubscribe, setCurrentUnsubscribe] = useState(null);

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

        // Récupérer le rôle de l'utilisateur
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && isMounted) {
          const userRole = userDoc.data().role;
          // Demander la permission pour les notifications avec le rôle correct
          await requestNotificationPermission(currentUser.uid, userRole);
        }

        // Écouter les notifications en temps réel
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
          if (error.code !== 'permission-denied') {
            console.error('Erreur lors de l\'écoute des notifications:', error);
          }
        });

        setCurrentUnsubscribe(() => unsub);

        // Écouter les notifications push
        const messageListener = onMessageListener().then(payload => {
          // Ajouter la nouvelle notification à la liste
          setNotifications(prev => [payload, ...prev]);
        });

        return () => unsub();
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des notifications:', error);
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

  // Fonction pour marquer une notification comme lue
  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
    }
  };

  // Gérer le clic sur une notification
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
