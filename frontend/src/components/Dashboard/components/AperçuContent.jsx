import React, { useState, useEffect } from 'react';
import {
  FaEnvelope,
  FaProjectDiagram,
  FaUser,
  FaFileInvoiceDollar,
  FaChartLine,
  FaClock,
  FaBell,
  FaCheckCircle,
  FaUsers
} from 'react-icons/fa';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import '../styles/apercu.css';
import RecentActivityList from './RecentActivityList';

const AperçuContent = ({ userRole, handleTabChange }) => {
  const [stats, setStats] = useState({
    devis: 0,
    projets: 0,
    messagesNonLus: 0,
    messagesTotaux: 0,
    utilisateurs: 0,
    taches: 0,
    devisEnAttente: 0,
    devisEnAttenteSignature: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        let statsData = {
          devis: 0,
          projets: 0,
          messagesNonLus: 0,
          messagesTotaux: 0,
          utilisateurs: 0,
          taches: 0,
          devisEnAttente: 0,
          devisEnAttenteSignature: 0
        };

        // Pour les administrateurs, récupérer toutes les données
        if (userRole === 'administrateur') {
          // Compter tous les devis
          const allDevisSnapshot = await getDocs(collection(db, 'devis'));
          statsData.devis = allDevisSnapshot.size;

          // Compter tous les projets
          const allProjetsSnapshot = await getDocs(collection(db, 'projects'));
          statsData.projets = allProjetsSnapshot.size;

          // Compter tous les messages
          const allMessagesSnapshot = await getDocs(collection(db, 'messages'));
          statsData.messagesTotaux = allMessagesSnapshot.size;

          // Compter tous les utilisateurs
          const allUsersSnapshot = await getDocs(collection(db, 'users'));
          statsData.utilisateurs = allUsersSnapshot.size;

          // Compter les devis en attente
          const devisEnAttenteQuery = query(
            collection(db, 'devis'),
            where('status', '==', 'en_attente')
          );
          const devisEnAttenteSnapshot = await getDocs(devisEnAttenteQuery);
          statsData.devisEnAttente = devisEnAttenteSnapshot.size;

          // Compter les devis en attente de signature
          const devisEnAttenteSignatureQuery = query(
            collection(db, 'devis'),
            where('status', '==', 'en_attente_signature')
          );
          const devisEnAttenteSignatureSnapshot = await getDocs(devisEnAttenteSignatureQuery);
          statsData.devisEnAttenteSignature = devisEnAttenteSignatureSnapshot.size;

          // Récupérer les activités récentes
          const recentActivitiesQuery = query(
            collection(db, 'activites'),
            orderBy('timestamp', 'desc'),
            limit(5)
          );
          const recentActivitiesSnapshot = await getDocs(recentActivitiesQuery);
          
          const activities = recentActivitiesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: data.type,
              title: data.title,
              description: data.description,
              time: new Date(data.timestamp.toDate()).toLocaleString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })
            };
          });

          setRecentActivity(activities);
        } else {
          // Pour les autres utilisateurs, récupérer leurs données spécifiques
          let devisQuery = query(
            collection(db, 'devis'),
            where(userRole === 'professional' ? 'professionnelId' : 'userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const devisSnapshot = await getDocs(devisQuery);
          statsData.devis = devisSnapshot.size;

          // Messages non lus
          const messagesNonLusQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', user.uid),
            where('read', '==', false)
          );
          const messagesNonLusSnapshot = await getDocs(messagesNonLusQuery);
          statsData.messagesNonLus = messagesNonLusSnapshot.size;

          // Total des messages
          const messagesTotauxQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', user.uid)
          );
          const messagesTotauxSnapshot = await getDocs(messagesTotauxQuery);
          statsData.messagesTotaux = messagesTotauxSnapshot.size;

          // Ajout des activités récentes pour les particuliers
          if (userRole === 'particulier') {
            const recentActivitiesQuery = query(
              collection(db, 'activites'),
              where('userId', '==', user.uid),
              orderBy('timestamp', 'desc'),
              limit(5)
            );
            const recentActivitiesSnapshot = await getDocs(recentActivitiesQuery);
            
            const activities = recentActivitiesSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                type: data.type,
                title: data.title,
                description: data.description,
                time: new Date(data.timestamp.toDate()).toLocaleString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              };
            });

            setRecentActivity(activities);
          }
        }

        setStats(statsData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  // Fonctions utilitaires
  const getActivityIcon = (type) => {
    const icons = {
      'devis': <FaFileInvoiceDollar />,
      'message': <FaEnvelope />,
      'projet': <FaProjectDiagram />,
      'default': <FaClock />
    };
    return icons[type] || icons['default'];
  };

  const getActivityColor = (type) => {
    const colors = {
      'devis': '#3b82f6',
      'message': '#10b981',
      'projet': '#8b5cf6',
      'default': '#f59e0b'
    };
    return colors[type] || colors['default'];
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Récemment';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.round((now - date) / (1000 * 60));
    
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    if (diffMinutes < 1440) return `Il y a ${Math.round(diffMinutes / 60)} h`;
    return `Il y a ${Math.round(diffMinutes / 1440)} j`;
  };

  // Définir les statistiques à afficher en fonction du rôle
  const getStatsList = () => {
    if (userRole === 'administrateur') {
      return [
        {
          icon: <FaUsers />,
          value: stats.utilisateurs,
          label: 'Utilisateurs',
          color: '#10b981',
          onClick: () => handleTabChange('utilisateurs')
        },
        {
          icon: <FaFileInvoiceDollar />,
          value: stats.devisEnAttente,
          label: 'Devis en attente',
          color: '#3b82f6',
          onClick: () => handleTabChange('validations')
        },
        {
          icon: <FaFileInvoiceDollar />,
          value: stats.devis,
          label: 'Devis totaux',
          color: '#6366f1',
          onClick: () => handleTabChange('devis')
        },
        {
          icon: <FaEnvelope />,
          value: stats.messagesTotaux,
          label: 'Messages totaux',
          color: '#f59e0b',
          onClick: () => {
            handleTabChange('messages', { showDeleted: true });
            setTimeout(() => {
              const historyButton = document.querySelector('.history-button');
              if (historyButton) {
                historyButton.click();
              }
            }, 100);
          }
        }
      ];
    }

    return [
      {
        icon: <FaFileInvoiceDollar />,
        value: stats.devis,
        label: 'Demande de devis en cours',
        color: '#10b981',
        onClick: () => handleTabChange('devis')
      },
      {
        icon: <FaEnvelope />,
        value: stats.messagesNonLus,
        label: 'Messages non lus',
        color: '#6366f1',
        onClick: () => handleTabChange('messages')
      },
      {
        icon: <FaEnvelope />,
        value: stats.messagesTotaux,
        label: 'Total messages',
        color: '#f59e0b',
        onClick: () => handleTabChange('messages', { showDeleted: true })
      },
      {
        icon: <FaFileInvoiceDollar />,
        value: stats.devisEnAttenteSignature,
        label: 'Devis en attente de signature',
        color: '#8b5cf6',
        onClick: () => handleTabChange('devis')
      }
    ];
  };

  if (loading) {
    return <div className="loading">Chargement du tableau de bord...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        <p>Une erreur s'est produite lors du chargement du tableau de bord :</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="apercu-container">
      <div className="stats-grid">
        {getStatsList().map((stat, index) => (
          <div
            key={index}
            className="stat-card"
            onClick={stat.onClick}
            style={{ borderColor: stat.color }}
          >
            <div className="stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {(userRole === 'administrateur' || userRole === 'particulier') && recentActivity.length > 0 && (
        <div className="recent-activity-section">
          <h2 className="section-title">
            <FaClock className="section-icon" />
            Activités Récentes
          </h2>
          <div className="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon" style={{ backgroundColor: getActivityColor(activity.type) }}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-description">{activity.description}</div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AperçuContent;
