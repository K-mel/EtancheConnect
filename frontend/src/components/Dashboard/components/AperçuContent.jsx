import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FaUsers, 
  FaBriefcase, 
  FaFileInvoiceDollar, 
  FaClock, 
  FaEnvelope,
  FaCheckCircle,
  FaProjectDiagram,
  FaUser,
  FaChartLine,
  FaBell 
} from 'react-icons/fa';
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
    devisEnAttenteSignature: 0,
    devisRecus: 0,
    devisEnCours: 0,
    devisSignes: 0
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
          console.log('No user logged in');
          setLoading(false);
          return;
        }

        // Vérifier explicitement le rôle dans Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        console.log('User document:', userDocSnap.data());

        let statsData = {
          devis: 0,
          projets: 0,
          messagesNonLus: 0,
          messagesTotaux: 0,
          utilisateurs: 0,
          taches: 0,
          devisEnAttente: 0,
          devisEnAttenteSignature: 0,
          devisRecus: 0,
          devisEnCours: 0,
          devisSignes: 0
        };

        // Pour les administrateurs, récupérer toutes les données
        if (userRole === 'administrateur') {
          console.log('Fetching admin data...');
          try {
            // Compter tous les devis
            console.log('Fetching devis...');
            const allDevisSnapshot = await getDocs(collection(db, 'devis'));
            statsData.devis = allDevisSnapshot.size;
            console.log('Devis count:', statsData.devis);

            // Compter tous les projets
            console.log('Fetching projects...');
            const allProjetsSnapshot = await getDocs(collection(db, 'projects'));
            statsData.projets = allProjetsSnapshot.size;
            console.log('Projects count:', statsData.projets);

            // Compter tous les messages
            console.log('Fetching messages...');
            const allMessagesSnapshot = await getDocs(collection(db, 'messages'));
            statsData.messagesTotaux = allMessagesSnapshot.size;
            console.log('Messages count:', statsData.messagesTotaux);

            // Compter tous les utilisateurs
            console.log('Fetching users...');
            const allUsersSnapshot = await getDocs(collection(db, 'users'));
            statsData.utilisateurs = allUsersSnapshot.size;
            console.log('Users count:', statsData.utilisateurs);

          } catch (error) {
            console.error('Error in admin data fetching:', error);
            throw error;
          }
        } else {
          console.log('Fetching user-specific data...');
          // Pour les autres utilisateurs, récupérer leurs données spécifiques
          let devisQuery;
          if (userRole === 'professionnel') {
            // Pour les professionnels
            const devisRef = collection(db, 'devis');
            const devisSnapshot = await getDocs(devisRef);
            
            // Nombre total de devis
            statsData.devisRecus = devisSnapshot.size;
            console.log('Devis reçus:', statsData.devisRecus);
            
            // Compter les devis par status
            let devisEnCours = 0;
            let devisSignes = 0;
            
            devisSnapshot.forEach((doc) => {
              const devis = doc.data();
              if (['en_discussion', 'en_attente_signature'].includes(devis.status)) {
                devisEnCours++;
              } else if (devis.status === 'signe') {
                devisSignes++;
              }
            });

            statsData.devisEnCours = devisEnCours;
            statsData.devisSignes = devisSignes;
            console.log('Devis en cours:', statsData.devisEnCours);
            console.log('Devis signés:', statsData.devisSignes);
          } else {
            // Pour les particuliers
            devisQuery = query(
              collection(db, 'devis'),
              where('userId', '==', user.uid)
            );
            const devisSnapshot = await getDocs(devisQuery);
            
            // Filtrer les devis non signés/refusés/annulés
            const devisEnCours = devisSnapshot.docs.filter(doc => {
              const data = doc.data();
              return !data.deletedForUser && 
                     !['signe', 'refuse', 'annule'].includes(data.status || 'en_attente');
            });
            
            statsData.devis = devisEnCours.length;
            console.log('Devis en cours:', statsData.devis);

            // Compter les devis en attente de signature
            const devisSignatureQuery = query(
              collection(db, 'professionalQuotes'),
              where('clientEmail', '==', user.email),
              where('status', '==', 'en_attente_validation')
            );
            const devisSignatureSnapshot = await getDocs(devisSignatureQuery);
            statsData.devisEnAttenteSignature = devisSignatureSnapshot.size;
            console.log('Devis en attente de signature:', statsData.devisEnAttenteSignature);
          }

          // Messages non lus
          const messagesNonLusQuery = query(
            collection(db, 'messages'),
            where('receiverId', '==', user.uid),
            where('read', '==', false)
          );
          const messagesNonLusSnapshot = await getDocs(messagesNonLusQuery);
          statsData.messagesNonLus = messagesNonLusSnapshot.size;
          console.log('Messages non lus:', statsData.messagesNonLus);

          // Total des messages
          const messagesTotauxQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', user.uid)
          );
          const messagesTotauxSnapshot = await getDocs(messagesTotauxQuery);
          statsData.messagesTotaux = messagesTotauxSnapshot.size;
          console.log('Messages totaux:', statsData.messagesTotaux);

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
            console.log('Activités récentes:', activities);
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
    switch (type) {
      case 'devis':
        return <FaFileInvoiceDollar />;
      case 'message':
        return <FaEnvelope />;
      case 'projet':
        return <FaBriefcase />;
      default:
        return <FaClock />;
    }
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

    if (userRole === 'professionnel') {
      return [
        {
          icon: <FaFileInvoiceDollar />,
          value: stats.devisRecus,
          label: 'Demande de devis reçu',
          color: '#10b981',
          onClick: () => handleTabChange('devis')
        },
        {
          icon: <FaClock />,
          value: stats.devisEnCours,
          label: 'Devis en attente de validation',
          color: '#3b82f6',
          onClick: () => handleTabChange('devis')
        },
        {
          icon: <FaCheckCircle />,
          value: stats.devisSignes,
          label: 'Devis signés',
          color: '#059669',
          onClick: () => handleTabChange('devis')
        },
        {
          icon: <FaEnvelope />,
          value: stats.messagesNonLus,
          label: 'Messages non lus',
          color: '#f59e0b',
          onClick: () => handleTabChange('messages')
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
        icon: <FaFileInvoiceDollar />,
        value: stats.devisEnAttenteSignature,
        label: 'Devis en attente de signature',
        color: '#8b5cf6',
        onClick: () => handleTabChange('devis-recus')
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
