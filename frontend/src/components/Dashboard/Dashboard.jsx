import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { 
  doc, 
  getDoc
} from 'firebase/firestore';
import { FaProjectDiagram, FaFileAlt, FaEnvelope, FaUsers, FaTools, FaUserTie, FaUserCheck } from 'react-icons/fa';
import DevisList from './DevisList';
import Messages from '../MessagesModule/Messages';
import ProfileContent from '../Profile/ProfileContent';
import AperçuContent from './components/AperçuContent';
import ProjetsContent from './components/ProjetsContent';
import UtilisateursContent from './components/UtilisateursContent';
import ValidationsContent from './components/ValidationsContent';
import StatistiquesContent from './components/StatistiquesContent';
import DevisContent from './components/DevisContent';
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
        return <AperçuContent userRole={userRole} handleTabChange={handleTabChange} />;
      case 'devis':
        return <DevisContent />;
      case 'messages':
        return <Messages userRole={userRole} />;
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

export default Dashboard;