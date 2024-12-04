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
    messages: 0,
    utilisateurs: 0,
    taches: 0,
    devisEnAttente: 0
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
          taches: 0,
          devisEnAttente: 0
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

          // Compter les devis en attente
          const devisEnAttenteQuery = query(
            collection(db, 'devis'),
            where('status', '==', 'en_attente')
          );
          const devisEnAttenteSnapshot = await getDocs(devisEnAttenteQuery);
          statsData.devisEnAttente = devisEnAttenteSnapshot.size;

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
          value: stats.messages,
          label: 'Messages totaux',
          color: '#f59e0b',
          onClick: () => {
            handleTabChange('messages');
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
        label: 'Devis en cours',
        color: '#10b981',
        onClick: () => handleTabChange('devis')
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
        color: '#6366f1',
        onClick: () => handleTabChange('messages')
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
    <div className="apercu-container">
      <div className="stats-grid">
        {getStatsList().map((stat, index) => (
          <div 
            key={index} 
            className="stat-card" 
            style={{ borderColor: stat.color, cursor: stat.onClick ? 'pointer' : 'default' }}
            onClick={stat.onClick}
          >
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

      {userRole === 'administrateur' && (
        <RecentActivityList activities={recentActivity} />
      )}
    </div>
  );
};

export default AperçuContent;
