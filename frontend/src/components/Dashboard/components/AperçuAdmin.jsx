import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { FiUsers, FiCheckCircle, FiMessageCircle, FiFileText } from 'react-icons/fi';
import '../styles/aperçuAdmin.css';
import { Link } from 'react-router-dom';

const AperçuAdmin = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingValidations: 0,
    totalMessages: 0,
    totalDevis: 0
  });
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Requêtes de base
        const usersQuery = collection(db, 'users');
        const messagesQuery = collection(db, 'messages');
        const devisQuery = collection(db, 'devis');
        
        // Requête pour les utilisateurs en attente de validation
        const pendingQuery = query(
          collection(db, 'users'),
          where('status', '==', 'pending')
        );

        // Requête pour les messages récents
        const recentMessagesQuery = query(
          collection(db, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        const [
          usersSnapshot,
          pendingSnapshot,
          messagesSnapshot,
          devisSnapshot,
          recentMessagesSnapshot
        ] = await Promise.all([
          getDocs(usersQuery),
          getDocs(pendingQuery),
          getDocs(messagesQuery),
          getDocs(devisQuery),
          getDocs(recentMessagesQuery)
        ]);

        setStats({
          totalUsers: usersSnapshot.size,
          pendingValidations: pendingSnapshot.size,
          totalMessages: messagesSnapshot.size,
          totalDevis: devisSnapshot.size
        });

        const messages = [];
        for (const doc of recentMessagesSnapshot.docs) {
          const messageData = doc.data();
          if (messageData.userId) {
            const userQuery = query(
              collection(db, 'users'),
              where('uid', '==', messageData.userId)
            );
            const userDoc = await getDocs(userQuery);
            const userData = userDoc.docs[0]?.data() || {};
            
            messages.push({
              id: doc.id,
              ...messageData,
              senderName: userData.displayName || 'Utilisateur inconnu'
            });
          } else {
            messages.push({
              id: doc.id,
              ...messageData,
              senderName: 'Utilisateur inconnu'
            });
          }
        }
        setRecentMessages(messages);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const StatCard = ({ icon: Icon, title, value }) => (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon />
      </div>
      <div className="stat-content">
        <h3>{title}</h3>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="stats-header">
        <h2>Tableau de bord administrateur</h2>
        <p className="subtitle">Vue d'ensemble des statistiques</p>
      </div>

      <div className="metrics-grid">
        <StatCard
          icon={FiUsers}
          title="Utilisateurs totaux"
          value={stats.totalUsers}
        />
        <StatCard
          icon={FiCheckCircle}
          title="En attente de validation"
          value={stats.pendingValidations}
        />
        <StatCard
          icon={FiMessageCircle}
          title="Messages totaux"
          value={stats.totalMessages}
        />
        <StatCard
          icon={FiFileText}
          title="Devis totaux"
          value={stats.totalDevis}
        />
      </div>

      <div className="recent-section">
        <h3>Messages récents</h3>
        <div className="messages-list">
          {recentMessages.length > 0 ? (
            recentMessages.map((message) => (
              <div key={message.id} className="message-item">
                <div className="message-info">
                  <span className="message-sender">{message.senderName}</span>
                  <span className="message-preview">{message.content}</span>
                </div>
                <span className="message-date">
                  {message.createdAt?.toDate().toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <p className="no-messages">Aucun message récent</p>
          )}
        </div>
        <Link to="/admin/messages" className="view-all-button">
          Voir tous les messages
        </Link>
      </div>
    </div>
  );
};

export default AperçuAdmin;
