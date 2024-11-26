import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  addDoc,
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { 
  FaPlus, 
  FaProjectDiagram, 
  FaTools, 
  FaCheckCircle, 
  FaFileAlt, 
  FaEnvelope, 
  FaUserTie, 
  FaUsers, 
  FaFileContract, 
  FaUserClock, 
  FaFileInvoice,
  FaUserCheck,
  FaUserTimes,
  FaChartBar,
  FaClock,
  FaPhone,
  FaCheck,
  FaTimes,
  FaEye
} from 'react-icons/fa';
import DevisList from './DevisList';
import '../../styles/dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('apercu');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    } else {
      // Récupérer le rôle de l'utilisateur depuis Firestore
      const fetchUserRole = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du rôle:', error);
        }
      };
      fetchUserRole();
    }
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // Navigation items en fonction du rôle
  const getNavigationItems = () => {
    const baseItems = [
      {
        id: 'apercu',
        label: 'Aperçu',
        icon: <FaProjectDiagram />
      }
    ];

    switch (userRole) {
      case 'particulier':
        return [
          ...baseItems,
          {
            id: 'devis',
            label: 'Mes Devis',
            icon: <FaFileAlt />
          },
          {
            id: 'messages',
            label: 'Messages',
            icon: <FaEnvelope />
          },
          {
            id: 'profile',
            label: 'Mon Profil',
            icon: <FaUsers />
          }
        ];

      case 'professionnel':
        return [
          ...baseItems,
          {
            id: 'devis',
            label: 'Devis Reçus',
            icon: <FaFileAlt />
          },
          {
            id: 'projets',
            label: 'Mes Projets',
            icon: <FaTools />
          },
          {
            id: 'messages',
            label: 'Messages',
            icon: <FaEnvelope />
          },
          {
            id: 'profile',
            label: 'Mon Profil',
            icon: <FaUserTie />
          }
        ];

      case 'administrateur':
        return [
          ...baseItems,
          {
            id: 'utilisateurs',
            label: 'Utilisateurs',
            icon: <FaUsers />
          },
          {
            id: 'validations',
            label: 'Validations',
            icon: <FaUserCheck />
          },
          {
            id: 'statistiques',
            label: 'Statistiques',
            icon: <FaProjectDiagram />
          },
          {
            id: 'profile',
            label: 'Mon Profil',
            icon: <FaUserTie />
          }
        ];

      default:
        return baseItems;
    }
  };

  const renderContent = () => {
    if (!userRole) return <div>Chargement...</div>;

    switch (activeTab) {
      case 'apercu':
        return <AperçuContent userRole={userRole} />;
      case 'devis':
        return <DevisContent />;
      case 'messages':
        return <MessagesContent userRole={userRole} />;
      case 'projets':
        return <ProjetsContent />;
      case 'utilisateurs':
        return <UtilisateursContent />;
      case 'validations':
        return <ValidationsContent />;
      case 'statistiques':
        return <StatistiquesContent />;
      case 'profile':
        return <ProfileContent userRole={userRole} />;
      default:
        return <AperçuContent userRole={userRole} />;
    }
  };

  if (!userRole) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="dashboard">
      <button className="mobile-menu-button" onClick={toggleSidebar}>
        <FaProjectDiagram />
      </button>

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>EtancheConnect</h2>
          <div className="role-badge">{userRole}</div>
        </div>
        <nav className="sidebar-nav">
          <ul>
            {getNavigationItems().map((item) => (
              <li key={item.id} className={activeTab === item.id ? 'active' : ''}>
                <button onClick={() => handleTabChange(item.id)}>
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <span className="icon">🚪</span>
            Déconnexion
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="content-header">
          <h1>
            {activeTab === 'apercu' && 'Tableau de bord'}
            {activeTab === 'devis' && (userRole === 'particulier' ? 'Mes Devis' : 'Devis Reçus')}
            {activeTab === 'messages' && 'Messagerie'}
            {activeTab === 'projets' && 'Mes Projets'}
            {activeTab === 'utilisateurs' && 'Gestion des Utilisateurs'}
            {activeTab === 'validations' && 'Validations en Attente'}
            {activeTab === 'statistiques' && 'Statistiques Globales'}
            {activeTab === 'profile' && 'Mon Profil'}
          </h1>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

// Composants pour les professionnels
const ProjetsContent = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        const projectsData = projectsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des projets:', error);
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return <div className="loading">Chargement des projets...</div>;
  }

  return (
    <div className="project-grid">
      {projects.map(project => (
        <div key={project.id} className="project-card">
          <h3>{project.title}</h3>
          <div className="project-details">
            <p><strong>Client:</strong> {project.clientName}</p>
            <p><strong>Status:</strong> {project.status}</p>
            <p><strong>Budget:</strong> {project.budget}€</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Composants pour les administrateurs
const UtilisateursContent = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        const usersData = usersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'administrateur':
        return 'admin';
      case 'professionnel':
        return 'pro';
      default:
        return 'user';
    }
  };

  if (loading) {
    return <div className="loading">Chargement des utilisateurs...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <h3>
              <FaUserTie className="user-icon" />
              {user.displayName || 'Utilisateur'}
            </h3>
            <p>
              <FaEnvelope />
              {user.email}
            </p>
            <p>
              <FaUserCheck />
              <span className={`user-role ${getRoleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            </p>
            {user.phoneNumber && (
              <p>
                <FaPhone />
                {user.phoneNumber}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ValidationsContent = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('status', '==', 'pending'));
        const pendingSnap = await getDocs(q);
        const pendingData = pendingSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPendingUsers(pendingData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs en attente:', error);
        setLoading(false);
      }
    };

    fetchPendingUsers();
  }, []);

  const handleValidation = async (userId, action) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: action === 'validate' ? 'validated' : 'rejected',
        updatedAt: new Date().toISOString()
      });
      
      // Mettre à jour la liste
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement des validations...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="validations-grid">
        {pendingUsers.map(user => (
          <div key={user.id} className="validation-card">
            <h3>
              <FaUserClock />
              {user.displayName || 'Professionnel'}
            </h3>
            <p>
              <FaEnvelope />
              {user.email}
            </p>
            <p>
              <FaClock />
              <span className="status-badge status-pending">
                En attente
              </span>
            </p>
            <div className="validation-actions">
              <button
                className="btn-validate"
                onClick={() => handleValidation(user.id, 'validate')}
              >
                <FaCheck /> Valider
              </button>
              <button
                className="btn-reject"
                onClick={() => handleValidation(user.id, 'reject')}
              >
                <FaTimes /> Refuser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatistiquesContent = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProfessionals: 0,
    totalProjects: 0,
    totalQuotes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersRef = collection(db, 'users');
        const projectsRef = collection(db, 'projects');
        const quotesRef = collection(db, 'quotes');

        const [usersSnap, projectsSnap, quotesSnap] = await Promise.all([
          getDocs(usersRef),
          getDocs(projectsRef),
          getDocs(quotesRef)
        ]);

        const professionals = usersSnap.docs.filter(doc => doc.data().role === 'professionnel');

        setStats({
          totalUsers: usersSnap.size,
          totalProfessionals: professionals.length,
          totalProjects: projectsSnap.size,
          totalQuotes: quotesSnap.size
        });
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="loading">Chargement des statistiques...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <FaUsers className="stat-icon" />
          <h3>Utilisateurs Total</h3>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        <div className="stat-card">
          <FaUserTie className="stat-icon" />
          <h3>Professionnels</h3>
          <div className="stat-value">{stats.totalProfessionals}</div>
        </div>
        <div className="stat-card">
          <FaProjectDiagram className="stat-icon" />
          <h3>Projets</h3>
          <div className="stat-value">{stats.totalProjects}</div>
        </div>
        <div className="stat-card">
          <FaFileContract className="stat-icon" />
          <h3>Devis</h3>
          <div className="stat-value">{stats.totalQuotes}</div>
        </div>
      </div>
    </div>
  );
};

const AperçuContent = ({ userRole }) => {
  const [stats, setStats] = useState({
    devis: 0,
    projets: 0,
    messages: 0,
    contacts: 0
  });
  const [recentItems, setRecentItems] = useState({
    devis: [],
    projets: [],
    messages: []
  });
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Récupérer le rôle de l'utilisateur
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        // Construire les requêtes en fonction du rôle
        let devisQuery, projetsQuery;
        
        if (userData.role === 'administrateur') {
          // Les administrateurs voient tout
          devisQuery = query(collection(db, 'devis'));
          projetsQuery = query(collection(db, 'projects'));
        } else if (userData.role === 'professionnel') {
          // Les professionnels voient les devis et projets qui leur sont assignés
          devisQuery = query(collection(db, 'devis'), 
            where('professionalId', '==', currentUser.uid));
          projetsQuery = query(collection(db, 'projects'), 
            where('professionalId', '==', currentUser.uid));
        } else {
          // Les particuliers voient leurs propres devis et projets
          devisQuery = query(collection(db, 'devis'), 
            where('userId', '==', currentUser.uid));
          projetsQuery = query(collection(db, 'projects'), 
            where('userId', '==', currentUser.uid));
        }

        // Requêtes pour les messages et contacts
        const messagesQuery = query(collection(db, 'messages'), 
          where('participants', 'array-contains', currentUser.uid));
        const contactsQuery = query(collection(db, 'contacts'), 
          where('userId', '==', currentUser.uid));

        // Exécuter les requêtes en groupes pour éviter les timeouts
        const [devisSnap, projetsSnap] = await Promise.all([
          getDocs(devisQuery),
          getDocs(projetsQuery)
        ]);

        const [messagesSnap, contactsSnap] = await Promise.all([
          getDocs(messagesQuery),
          getDocs(contactsQuery)
        ]);

        setStats({
          devis: devisSnap.size,
          projets: projetsSnap.size,
          messages: messagesSnap.size,
          contacts: contactsSnap.size
        });

        // Récupérer les éléments récents avec les informations complètes
        const recentDevis = await Promise.all(
          devisSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
            .slice(0, 3)
            .map(async (devis) => {
              if (devis.professionalId) {
                try {
                  const proDoc = await getDoc(doc(db, 'users', devis.professionalId));
                  if (proDoc.exists()) {
                    devis.professionnel = proDoc.data();
                  }
                } catch (error) {
                  console.error('Erreur lors de la récupération du professionnel:', error);
                }
              }
              return devis;
            })
        );

        const recentProjets = projetsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
          .slice(0, 3);

        const recentMessages = messagesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))
          .slice(0, 3);

        setRecentItems({
          devis: recentDevis,
          projets: recentProjets,
          messages: recentMessages
        });

        setError(null);
      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        setError("Impossible de charger les statistiques. Veuillez réessayer plus tard.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  if (loading) {
    return <div className="loading-spinner">Chargement des statistiques...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="overview-container">
        <div className="stat-card">
          <div className="stat-header">
            <FaFileAlt />
            <h3 className="stat-title">Devis</h3>
          </div>
          <div className="stat-value">{stats.devis}</div>
          <p className="stat-description">Devis en cours</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <FaProjectDiagram />
            <h3 className="stat-title">Projets</h3>
          </div>
          <div className="stat-value">{stats.projets}</div>
          <p className="stat-description">Projets actifs</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <FaEnvelope />
            <h3 className="stat-title">Messages</h3>
          </div>
          <div className="stat-value">{stats.messages}</div>
          <p className="stat-description">Messages non lus</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <FaUsers />
            <h3 className="stat-title">Contacts</h3>
          </div>
          <div className="stat-value">{stats.contacts}</div>
          <p className="stat-description">Contacts actifs</p>
        </div>
      </div>

      <div className="recent-sections">
        <div className="recent-section">
          <div className="recent-section-header">
            <h3 className="recent-section-title">
              <FaFileAlt />
              Devis récents
            </h3>
            <button className="view-all-button" onClick={() => navigate('/devis')}>
              Voir tout
            </button>
          </div>
          {recentItems.devis.map(devis => (
            <div key={devis.id} className="recent-item">
              <div className="recent-item-header">
                <h4 className="recent-item-title">{devis.title || 'Sans titre'}</h4>
                <span className="recent-item-date">
                  {new Date(devis.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="recent-item-description">
                {devis.description?.substring(0, 100)}
                {devis.description?.length > 100 ? '...' : ''}
              </p>
            </div>
          ))}
        </div>

        <div className="recent-section">
          <div className="recent-section-header">
            <h3 className="recent-section-title">
              <FaProjectDiagram />
              Projets récents
            </h3>
            <button className="view-all-button" onClick={() => navigate('/projets')}>
              Voir tout
            </button>
          </div>
          {recentItems.projets.map(projet => (
            <div key={projet.id} className="recent-item">
              <div className="recent-item-header">
                <h4 className="recent-item-title">{projet.title || 'Sans titre'}</h4>
                <span className="recent-item-date">
                  {new Date(projet.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="recent-item-description">
                {projet.description?.substring(0, 100)}
                {projet.description?.length > 100 ? '...' : ''}
              </p>
            </div>
          ))}
        </div>

        <div className="recent-section">
          <div className="recent-section-header">
            <h3 className="recent-section-title">
              <FaEnvelope />
              Messages récents
            </h3>
            <button className="view-all-button" onClick={() => navigate('/messages')}>
              Voir tout
            </button>
          </div>
          {recentItems.messages.map(message => (
            <div key={message.id} className="recent-item">
              <div className="recent-item-header">
                <h4 className="recent-item-title">
                  {message.subject || 'Sans objet'}
                </h4>
                <span className="recent-item-date">
                  {new Date(message.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="recent-item-description">
                {message.content?.substring(0, 100)}
                {message.content?.length > 100 ? '...' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DevisContent = () => {
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération du rôle:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [currentUser]);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!userRole) return <div>Rôle non trouvé</div>;

  return <DevisList userType={userRole} />;
};

const MessagesContent = ({ userRole }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser) return;

      try {
        const messagesRef = collection(db, 'messages');
        const q = query(
          messagesRef,
          where('participants', 'array-contains', currentUser.uid),
          orderBy('timestamp', 'asc')
        );

        

        const querySnapshot = await getDocs(q);
        const messagesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setMessages(messagesList);
        setLoading(false);

        // Récupérer les informations des utilisateurs
        const userIds = new Set();
        messagesList.forEach(msg => {
          userIds.add(msg.senderId);
          userIds.add(msg.recipientId);
        });

        const usersData = {};
        for (const userId of userIds) {
          if (userId !== currentUser.uid) {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              usersData[userId] = userDoc.data();
            }
          }
        }
        setUsers(usersData);
      } catch (error) {
        console.error("Erreur lors de la récupération des messages:", error);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [currentUser]);

  const sendMessage = async (recipientId) => {
    if (!newMessage.trim() || !currentUser || !recipientId) return;

    try {
      const messagesRef = collection(db, 'messages');
      const newMessageData = {
        content: newMessage.trim(),
        senderId: currentUser.uid,
        recipientId: recipientId,
        timestamp: new Date().toISOString(),
        read: false,
        participants: [currentUser.uid, recipientId]
      };

      await addDoc(messagesRef, newMessageData);
      setNewMessage('');
      // Rafraîchir la liste des messages
      const updatedMessages = [...messages, { ...newMessageData, id: Date.now().toString() }];
      setMessages(updatedMessages);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement des messages...</div>;
  }

  return (
    <div className="messages-container">
      <div className="messages-list">
        <h3>Conversations</h3>
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>Aucun message</p>
          </div>
        ) : (
          messages.map((message) => {
            const otherUserId = message.senderId === currentUser.uid ? message.recipientId : message.senderId;
            const otherUser = users[otherUserId];
            
            return (
              <div
                key={message.id}
                className={`message-preview ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                onClick={() => setSelectedMessage(message)}
              >
                <div className="message-preview-header">
                  <span className="user-name">{otherUser?.displayName || 'Utilisateur'}</span>
                  <span className="message-date">
                    {new Date(message.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="message-preview-content">
                  <p>{message.content}</p>
                </div>
                {!message.read && message.recipientId === currentUser.uid && (
                  <span className="unread-badge">Nouveau</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedMessage && (
        <div className="message-detail">
          <div className="message-detail-header">
            <h3>
              {users[selectedMessage.senderId === currentUser.uid ? 
                selectedMessage.recipientId : selectedMessage.senderId]?.displayName || 'Utilisateur'}
            </h3>
          </div>
          <div className="message-content">
            <p>{selectedMessage.content}</p>
          </div>
          <div className="message-reply">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre réponse..."
            />
            <button 
              className="btn-primary"
              onClick={() => sendMessage(
                selectedMessage.senderId === currentUser.uid ? 
                  selectedMessage.recipientId : selectedMessage.senderId
              )}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileContent = ({ userRole }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    companyName: '',
    siret: '',
    sector: '',
    workingArea: '',
    serviceDescription: '',
    rates: '',
    bankName: '',
    iban: '',
    bic: '',
    documents: {
      idCard: { contentType: '', fileName: '', uploadedAt: '', url: '' },
      insurance: { contentType: '', fileName: '', uploadedAt: '', url: '' },
      kbis: { contentType: '', fileName: '', uploadedAt: '', url: '' }
    },
    status: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('User data from Firestore:', data);
            
            // Mettre à jour userData avec les données de Firestore
            setUserData({
              displayName: data.displayName || '',
              email: data.email || '',
              phone: data.phone || '',
              address: data.address || '',
              role: data.role || '',
              companyName: data.companyName || '',
              siret: data.siret || '',
              sector: data.sector || '',
              workingArea: data.workingArea || '',
              serviceDescription: data.serviceDescription || '',
              rates: data.rates || '',
              bankName: data.bankName || '',
              iban: data.iban || '',
              bic: data.bic || '',
              documents: {
                idCard: data.documents?.idCard || { contentType: '', fileName: '', uploadedAt: '', url: '' },
                insurance: data.documents?.insurance || { contentType: '', fileName: '', uploadedAt: '', url: '' },
                kbis: data.documents?.kbis || { contentType: '', fileName: '', uploadedAt: '', url: '' }
              },
              status: data.status || ''
            });
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        setError('Erreur lors de la récupération des données');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (currentUser) {
        const updateData = {
          displayName: userData.displayName,
          phone: userData.phone,
          address: userData.address
        };

        if (userData.role === 'professionnel') {
          Object.assign(updateData, {
            companyName: userData.companyName,
            sector: userData.sector,
            workingArea: userData.workingArea,
            serviceDescription: userData.serviceDescription,
            rates: userData.rates,
            bankName: userData.bankName,
            iban: userData.iban,
            bic: userData.bic
          });
        }

        await setDoc(doc(db, 'users', currentUser.uid), updateData, { merge: true });
        setSuccess('Profil mis à jour avec succès !');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du profil:', err);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <img src="https://via.placeholder.com/100" alt="Profile" />
          </div>
          <div className="profile-info">
            <h2>{userData.displayName || 'Utilisateur'}</h2>
            <p>{userData.role === 'professionnel' ? 'Professionnel' : 'Particulier'}</p>
            {userData.role === 'professionnel' && (
              <p className="status">Statut: {userData.status || 'En attente'}</p>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="profile-details">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nom complet</label>
              <input
                type="text"
                name="displayName"
                value={userData.displayName || ''}
                onChange={handleChange}
                readOnly={!isEditing}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={userData.email || ''}
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="tel"
                name="phone"
                value={userData.phone || ''}
                onChange={handleChange}
                readOnly={!isEditing}
              />
            </div>
            <div className="form-group">
              <label>Adresse</label>
              <textarea
                name="address"
                value={userData.address || ''}
                onChange={handleChange}
                readOnly={!isEditing}
              />
            </div>

            {userData.role === 'professionnel' && (
              <>
                <div className="form-group">
                  <label>Nom de l'entreprise</label>
                  <input
                    type="text"
                    name="companyName"
                    value={userData.companyName || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>SIRET</label>
                  <input
                    type="text"
                    name="siret"
                    value={userData.siret || ''}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Secteur d'activité</label>
                  <input
                    type="text"
                    name="sector"
                    value={userData.sector || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Zone de travail</label>
                  <input
                    type="text"
                    name="workingArea"
                    value={userData.workingArea || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Description des services</label>
                  <textarea
                    name="serviceDescription"
                    value={userData.serviceDescription || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Tarifs</label>
                  <textarea
                    name="rates"
                    value={userData.rates || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Nom de la banque</label>
                  <input
                    type="text"
                    name="bankName"
                    value={userData.bankName || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>IBAN</label>
                  <input
                    type="text"
                    name="iban"
                    value={userData.iban || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>BIC</label>
                  <input
                    type="text"
                    name="bic"
                    value={userData.bic || ''}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
                <div className="documents-section">
                  <h3>Documents</h3>
                  <div className="document-item">
                    <label>Carte d'identité</label>
                    {userData.documents?.idCard?.url && (
                      <a href={userData.documents.idCard.url} target="_blank" rel="noopener noreferrer">
                        Voir le document
                      </a>
                    )}
                  </div>
                  <div className="document-item">
                    <label>Assurance</label>
                    {userData.documents?.insurance?.url && (
                      <a href={userData.documents.insurance.url} target="_blank" rel="noopener noreferrer">
                        Voir le document
                      </a>
                    )}
                  </div>
                  <div className="document-item">
                    <label>KBIS</label>
                    {userData.documents?.kbis?.url && (
                      <a href={userData.documents.kbis.url} target="_blank" rel="noopener noreferrer">
                        Voir le document
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}

            {!isEditing ? (
              <button
                type="button"
                className="edit-button"
                onClick={() => setIsEditing(true)}
              >
                Modifier le profil
              </button>
            ) : (
              <div className="button-group">
                <button type="submit" className="save-button">
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setIsEditing(false)}
                >
                  Annuler
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
