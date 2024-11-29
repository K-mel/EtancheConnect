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

const AperçuContent = ({ userRole, handleTabChange }) => {
  const [stats, setStats] = useState({
    devis: 0,
    projets: 0,
    messages: 0,
    utilisateurs: 0,
    taches: 0
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
          messages: 0,
          utilisateurs: 0,
          taches: 0
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
          statsData.messages = allMessagesSnapshot.size;

          // Compter tous les utilisateurs
          const allUsersSnapshot = await getDocs(collection(db, 'users'));
          statsData.utilisateurs = allUsersSnapshot.size;

        } else {
          // Pour les autres utilisateurs, récupérer leurs données spécifiques
          let devisQuery = query(
            collection(db, 'devis'),
            where(userRole === 'professional' ? 'professionnelId' : 'userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const devisSnapshot = await getDocs(devisQuery);
          statsData.devis = devisSnapshot.size;

          const projetsQuery = query(
            collection(db, 'projects'),
            where(userRole === 'professional' ? 'professionnelId' : 'userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const projetsSnapshot = await getDocs(projetsQuery);
          statsData.projets = projetsSnapshot.size;

          const messagesQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', user.uid),
            where('read', '==', false)
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          statsData.messages = messagesSnapshot.size;
        }

        // Récupérer les activités récentes
        let activities = [];
        try {
          const activityQuery = query(
            collection(db, 'activites'),
            userRole === 'administrateur' ? orderBy('timestamp', 'desc') : where('userId', '==', user.uid),
            limit(5)
          );
          const activitySnapshot = await getDocs(activityQuery);

          activities = activitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              icon: getActivityIcon(data.type),
              title: data.titre || 'Activité',
              description: data.description || 'Aucune description',
              time: formatTime(data.timestamp),
              color: getActivityColor(data.type)
            };
          });
        } catch (activityError) {
          console.warn('Erreur lors de la récupération des activités:', activityError);
          activities = [
            {
              icon: <FaClock />,
              title: 'Tableau de bord',
              description: 'Bienvenue sur votre espace',
              time: 'Maintenant',
              color: '#f59e0b'
            }
          ];
        }

        setStats(statsData);
        setRecentActivity(activities);
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
          color: '#10b981'
        },
        {
          icon: <FaFileInvoiceDollar />,
          value: stats.devis,
          label: 'Devis totaux',
          color: '#3b82f6'
        },
        {
          icon: <FaProjectDiagram />,
          value: stats.projets,
          label: 'Projets totaux',
          color: '#6366f1'
        },
        {
          icon: <FaEnvelope />,
          value: stats.messages,
          label: 'Messages totaux',
          color: '#8b5cf6'
        }
      ];
    }

    return [
      {
        icon: <FaFileInvoiceDollar />,
        value: stats.devis,
        label: 'Devis en cours',
        color: '#10b981'
      },
      {
        icon: <FaProjectDiagram />,
        value: stats.projets,
        label: 'Projets actifs',
        color: '#3b82f6'
      },
      {
        icon: <FaEnvelope />,
        value: stats.messages,
        label: 'Messages non lus',
        color: '#6366f1'
      },
      {
        icon: <FaChartLine />,
        value: stats.taches,
        label: 'Tâches en cours',
        color: '#8b5cf6'
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
    <div className="apercu-content">
      <div className="stats-grid">
        {getStatsList().map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderColor: stat.color }}>
            <div className="stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-details">
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-label">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="recent-activity">
        <h2>Activité Récente</h2>
        {recentActivity.length > 0 ? (
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon" style={{ color: activity.color }}>
                  {activity.icon}
                </div>
                <div className="activity-details">
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-activity">Aucune activité récente</p>
        )}
      </div>
    </div>
  );
};

export default AperçuContent;
