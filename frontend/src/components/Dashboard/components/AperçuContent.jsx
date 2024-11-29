import React, { useState, useEffect } from 'react';
import {
  FaEnvelope,
  FaProjectDiagram,
  FaUser,
  FaFileInvoiceDollar,
  FaChartLine,
  FaClock,
  FaBell,
  FaCheckCircle
} from 'react-icons/fa';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import '../styles/apercu.css';

const AperçuContent = ({ userRole, handleTabChange }) => {
  const [stats, setStats] = useState({
    devis: 0,
    projets: 0,
    messages: 0,
    taches: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const user = auth.currentUser;
        console.log('Current user:', user);
        console.log('User role:', userRole);
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Récupérer les statistiques
        let devisQuery;
        if (userRole === 'professional') {
          console.log('Fetching devis for professional:', user.uid);
          devisQuery = query(
            collection(db, 'devis'),
            where('professionnelId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          console.log('Fetching devis for particular:', user.uid);
          devisQuery = query(
            collection(db, 'devis'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        }
        const devisSnapshot = await getDocs(devisQuery);
        console.log('Devis count:', devisSnapshot.size);
        console.log('Devis data:', devisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        console.log('Fetching projects...');
        const projetsQuery = query(
          collection(db, 'projects'),
          where(userRole === 'professional' ? 'professionnelId' : 'userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const projetsSnapshot = await getDocs(projetsQuery);
        console.log('Projects count:', projetsSnapshot.size);
        console.log('Projects data:', projetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        console.log('Fetching messages...');
        const messagesQuery = query(
          collection(db, 'messages'),
          where('participants', 'array-contains', user.uid),
          where('read', '==', false)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        console.log('Messages count:', messagesSnapshot.size);
        console.log('Messages data:', messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Récupérer les activités récentes
        let activities = [];
        try {
          const activityQuery = query(
            collection(db, 'activites'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(5)
          );
          const activitySnapshot = await getDocs(activityQuery);

          // Transformer les activités récentes
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
          // Utiliser des activités par défaut si la requête échoue
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

        // Mettre à jour les statistiques
        setStats({
          devis: devisSnapshot.size,
          projets: projetsSnapshot.size,
          messages: messagesSnapshot.size,
          taches: 0 // À implémenter selon votre logique de tâches
        });

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

  const stats_list = [
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

  const actions = [
    {
      icon: <FaFileInvoiceDollar />,
      title: 'Nouveau devis',
      description: 'Créer une nouvelle demande de devis',
      action: () => handleTabChange('devis')
    },
    {
      icon: <FaEnvelope />,
      title: 'Messages',
      description: 'Consulter vos messages et notifications',
      action: () => handleTabChange('messages')
    },
    {
      icon: <FaProjectDiagram />,
      title: 'Projets',
      description: 'Gérer vos projets en cours',
      action: () => handleTabChange('projets')
    }
  ];

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
      <div className="apercu-header">
        <h1>Tableau de bord</h1>
        <p>Bienvenue sur votre espace {userRole}</p>
      </div>

      <div className="stats-grid">
        {stats_list.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="quick-actions">
        <h2 className="section-title">Actions rapides</h2>
        <div className="actions-grid">
          {actions.map((action, index) => (
            <div key={index} className="action-card" onClick={action.action}>
              <div className="action-icon">
                {action.icon}
              </div>
              <div className="action-content">
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="recent-activity">
        <h2 className="section-title">Activité récente</h2>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div 
                  className="activity-icon" 
                  style={{ background: `${activity.color}15`, color: activity.color }}
                >
                  {activity.icon}
                </div>
                <div className="activity-content">
                  <h4>{activity.title}</h4>
                  <p>{activity.description}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-activity">Aucune activité récente</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AperçuContent;
