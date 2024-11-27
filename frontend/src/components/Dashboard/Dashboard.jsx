import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import './Dashboard.css';
import { FaProjectDiagram, FaTools, FaCheckCircle, FaFileAlt, FaEnvelope, FaUserTie, FaUsers, FaFileContract, FaUserClock, FaPlus, FaFileInvoice, FaUserCheck } from 'react-icons/fa';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('apercu');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/'); // Redirection vers la page d'accueil
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'apercu':
        return <AperçuContent />;
      case 'devis':
        return <DevisContent />;
      case 'messages':
        return <MessagesContent />;
      case 'profile':
        return <ProfileContent />;
      default:
        return <AperçuContent />;
    }
  };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>EtancheConnect</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className={activeTab === 'apercu' ? 'active' : ''}>
              <button onClick={() => setActiveTab('apercu')}>
                <span className="icon">📊</span>
                Aperçu
              </button>
            </li>
            <li className={activeTab === 'devis' ? 'active' : ''}>
              <button onClick={() => setActiveTab('devis')}>
                <span className="icon">📝</span>
                Devis
              </button>
            </li>
            <li className={activeTab === 'messages' ? 'active' : ''}>
              <button onClick={() => setActiveTab('messages')}>
                <span className="icon">✉️</span>
                Messages
              </button>
            </li>
            <li className={activeTab === 'profile' ? 'active' : ''}>
              <button onClick={() => setActiveTab('profile')}>
                <span className="icon">👤</span>
                Profile
              </button>
            </li>
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
            {activeTab === 'devis' && 'Gestion des devis'}
            {activeTab === 'messages' && 'Messagerie'}
            {activeTab === 'profile' && 'Mon profil'}
          </h1>
        </div>
        <div className="content-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const AperçuContent = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingQuotes: 0,
    userQuotes: 0,
    userActiveProjects: 0,
    userCompletedProjects: 0,
    unreadMessages: 0,
    totalProfessionals: 0,
    totalIndividuals: 0,
    totalQuotes: 0,
    pendingValidations: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser || !userData) return;

      try {
        switch (userData.role) {
          case 'professionnel':
            const projectsRef = collection(db, 'projects');
            const projectsQuery = query(
              projectsRef,
              where('professionalId', '==', currentUser.uid)
            );
            const projectsSnapshot = await getDocs(projectsQuery);

            let active = 0;
            let completed = 0;

            projectsSnapshot.forEach((doc) => {
              const project = doc.data();
              if (project.status === 'completed') {
                completed++;
              } else {
                active++;
              }
            });

            // Fetch pending quotes
            const quotesRef = collection(db, 'quotes');
            const quotesQuery = query(
              quotesRef,
              where('professionalId', '==', currentUser.uid),
              where('status', '==', 'pending')
            );
            const quotesSnapshot = await getDocs(quotesQuery);

            setStats({
              totalProjects: projectsSnapshot.size,
              activeProjects: active,
              completedProjects: completed,
              pendingQuotes: quotesSnapshot.size
            });
            break;

          case 'particulier':
            // Récupérer les devis de l'utilisateur
            const userQuotesQuery = query(
              collection(db, 'quotes'),
              where('userId', '==', currentUser.uid)
            );
            const userQuotesSnapshot = await getDocs(userQuotesQuery);

            // Récupérer les projets de l'utilisateur
            const userProjectsQuery = query(
              collection(db, 'projects'),
              where('userId', '==', currentUser.uid)
            );
            const userProjectsSnapshot = await getDocs(userProjectsQuery);

            let userActiveProjects = 0;
            let userCompletedProjects = 0;

            userProjectsSnapshot.forEach((doc) => {
              const project = doc.data();
              if (project.status === 'completed') {
                userCompletedProjects++;
              } else {
                userActiveProjects++;
              }
            });

            // Récupérer les messages non lus
            const messagesQuery = query(
              collection(db, 'messages'),
              where('recipientId', '==', currentUser.uid),
              where('read', '==', false)
            );
            const unreadMessagesSnapshot = await getDocs(messagesQuery);

            setStats({
              userQuotes: userQuotesSnapshot.size,
              userActiveProjects,
              userCompletedProjects,
              unreadMessages: unreadMessagesSnapshot.size
            });
            break;

          case 'administrateur':
            // Compter le nombre total de professionnels
            const proQuery = query(
              collection(db, 'users'),
              where('role', '==', 'professionnel')
            );
            const proSnapshot = await getDocs(proQuery);

            // Compter le nombre total de particuliers
            const particQuery = query(
              collection(db, 'users'),
              where('role', '==', 'particulier')
            );
            const particSnapshot = await getDocs(particQuery);

            // Compter le nombre total de devis en cours
            const activeQuotesQuery = query(
              collection(db, 'quotes'),
              where('status', '==', 'pending')
            );
            const activeQuotesSnapshot = await getDocs(activeQuotesQuery);

            // Compter le nombre de professionnels en attente de validation
            const pendingProQuery = query(
              collection(db, 'users'),
              where('role', '==', 'professionnel'),
              where('validated', '==', false)
            );
            const pendingProSnapshot = await getDocs(pendingProQuery);

            setStats({
              totalProfessionals: proSnapshot.size,
              totalIndividuals: particSnapshot.size,
              totalQuotes: activeQuotesSnapshot.size,
              pendingValidations: pendingProSnapshot.size
            });
            break;
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [currentUser, userData]);

  const renderProfessionalStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">
          <FaProjectDiagram />
        </div>
        <div className="stat-content">
          <h3>Total des Projets</h3>
          <div className="stat-number">{stats.totalProjects || 0}</div>
          <p className="stat-description">Projets en cours et terminés</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaTools />
        </div>
        <div className="stat-content">
          <h3>Projets Actifs</h3>
          <div className="stat-number">{stats.activeProjects || 0}</div>
          <p className="stat-description">Projets en cours de réalisation</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaCheckCircle />
        </div>
        <div className="stat-content">
          <h3>Projets Terminés</h3>
          <div className="stat-number">{stats.completedProjects || 0}</div>
          <p className="stat-description">Projets achevés avec succès</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaFileAlt />
        </div>
        <div className="stat-content">
          <h3>Devis en Attente</h3>
          <div className="stat-number">{stats.pendingQuotes || 0}</div>
          <p className="stat-description">Devis à traiter</p>
        </div>
      </div>
    </div>
  );

  const renderIndividualStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">
          <FaFileInvoice />
        </div>
        <div className="stat-content">
          <h3>Mes Devis</h3>
          <div className="stat-number">{stats.userQuotes || 0}</div>
          <p className="stat-description">Devis en cours</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaTools />
        </div>
        <div className="stat-content">
          <h3>Projets en Cours</h3>
          <div className="stat-number">{stats.userActiveProjects || 0}</div>
          <p className="stat-description">Travaux en cours de réalisation</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaCheckCircle />
        </div>
        <div className="stat-content">
          <h3>Projets Terminés</h3>
          <div className="stat-number">{stats.userCompletedProjects || 0}</div>
          <p className="stat-description">Projets achevés</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaEnvelope />
        </div>
        <div className="stat-content">
          <h3>Messages Non Lus</h3>
          <div className="stat-number">{stats.unreadMessages || 0}</div>
          <p className="stat-description">Messages à consulter</p>
        </div>
      </div>
    </div>
  );

  const renderAdminStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">
          <FaUserTie />
        </div>
        <div className="stat-content">
          <h3>Professionnels</h3>
          <div className="stat-number">{stats.totalProfessionals || 0}</div>
          <p className="stat-description">Professionnels inscrits</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaUsers />
        </div>
        <div className="stat-content">
          <h3>Particuliers</h3>
          <div className="stat-number">{stats.totalIndividuals || 0}</div>
          <p className="stat-description">Clients inscrits</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaFileContract />
        </div>
        <div className="stat-content">
          <h3>Devis en Cours</h3>
          <div className="stat-number">{stats.totalQuotes || 0}</div>
          <p className="stat-description">Devis actifs</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <FaUserClock />
        </div>
        <div className="stat-content">
          <h3>En Attente de Validation</h3>
          <div className="stat-number">{stats.pendingValidations || 0}</div>
          <p className="stat-description">Professionnels à valider</p>
        </div>
      </div>
    </div>
  );

  if (!userData) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="apercu-content">
      <div className="welcome-section">
        <h2>Bienvenue, {userData.displayName || 'Utilisateur'}</h2>
        <p>
          {userData.role === 'professionnel'
            ? 'Gérez vos projets et devis en cours'
            : userData.role === 'administrateur'
            ? 'Supervisez l\'activité de la plateforme'
            : 'Suivez l\'avancement de vos projets'}
        </p>
      </div>

      {userData.role === 'professionnel' && renderProfessionalStats()}
      {userData.role === 'particulier' && renderIndividualStats()}
      {userData.role === 'administrateur' && renderAdminStats()}

      <div className="action-section">
        {userData.role === 'professionnel' && (
          <div className="action-buttons">
            <button className="action-button" onClick={() => navigate('/quotes')}>
              <FaFileAlt className="button-icon" />
              Voir les devis en attente
            </button>
            <button className="action-button" onClick={() => navigate('/projects')}>
              <FaProjectDiagram className="button-icon" />
              Gérer mes projets
            </button>
          </div>
        )}
        {userData.role === 'particulier' && (
          <div className="action-buttons">
            <button className="action-button" onClick={() => navigate('/devis/particulier')}>
              <FaPlus className="button-icon" />
              Nouveau devis
            </button>
            <button className="action-button" onClick={() => navigate('/messages')}>
              <FaEnvelope className="button-icon" />
              Voir mes messages
            </button>
          </div>
        )}
        {userData.role === 'administrateur' && (
          <div className="action-buttons">
            <button className="action-button" onClick={() => navigate('/admin/validations')}>
              <FaUserCheck className="button-icon" />
              Valider les professionnels
            </button>
            <button className="action-button" onClick={() => navigate('/admin/users')}>
              <FaUsers className="button-icon" />
              Gérer les utilisateurs
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DevisContent = () => {
  return (
    <div>
      <h2>Devis</h2>
      {/* Contenu pour la gestion des devis */}
    </div>
  );
};

const MessagesContent = () => {
  return (
    <div>
      <h2>Messages</h2>
      {/* Contenu pour la messagerie */}
    </div>
  );
};

const TravauxContent = () => {
  return (
    <div>
      <h2>Travaux</h2>
      {/* Contenu pour la gestion des travaux */}
    </div>
  );
};

const ProfileContent = () => {
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
