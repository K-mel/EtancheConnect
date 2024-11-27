import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('apercu');
  const { currentUser, userType, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
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

  const renderContent = () => {
    switch (activeTab) {
      case 'apercu':
        return <AperçuContent userType={userType} />;
      case 'devis':
        return <DevisContent userType={userType} />;
      case 'messages':
        return <MessagesContent />;
      case 'profile':
        return <ProfileContent userType={userType} />;
      default:
        return <AperçuContent userType={userType} />;
    }
  };

  const getMenuItems = () => {
    const commonItems = [
      { id: 'apercu', label: 'Aperçu', icon: '📊' },
      { id: 'devis', label: 'Devis', icon: '📝' },
      { id: 'messages', label: 'Messages', icon: '✉️' },
      { id: 'profile', label: 'Profile', icon: '👤' },
    ];

    if (userType === 'admin') {
      return [
        ...commonItems,
        { id: 'utilisateurs', label: 'Utilisateurs', icon: '👥' },
        { id: 'validation', label: 'Validation', icon: '✓' },
      ];
    }

    return commonItems;
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>EtancheConnect</h2>
        </div>
        <nav className="sidebar-nav">
          {getMenuItems().map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-text">{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>{getMenuItems().find(item => item.id === activeTab)?.label}</h1>
          <div className="user-menu">
            <span className="notification-badge">🔔</span>
            <span className="user-name">{currentUser?.displayName || 'Utilisateur'}</span>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
            <div className="user-profile">
              <span className="profile-icon">👤</span>
            </div>
          </div>
        </header>
        <div className="dashboard-content-scrollable">
          <div className="central-content">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

// Composants de contenu
const AperçuContent = ({ userType }) => {
  const navigate = useNavigate();
  
  return (
    <div className="apercu-content">
      <div className="welcome-section">
        <h2>Bienvenue sur votre tableau de bord</h2>
        <p>Gérez vos devis et suivez vos projets d'étanchéité en toute simplicité.</p>
      </div>

      {userType === 'particulier' && (
        <div className="action-section">
          <button 
            className="devis-button"
            onClick={() => navigate('/devis/particulier')}
          >
            Faire une demande de devis
          </button>
        </div>
      )}

      <div className="stats-section">
        <div className="stat-card">
          <h3>Devis en cours</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Messages non lus</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Projets terminés</h3>
          <p className="stat-number">0</p>
        </div>
      </div>
    </div>
  );
};

const DevisContent = ({ userType }) => {
  const [devis, setDevis] = useState([
    {
      id: 'DEV-2023-001',
      date: '01/01/2023',
      client: 'Jean Dupont',
      description: 'Réparation toiture terrasse',
      status: 'en_attente',
      montant: '2500€',
      messages: 2
    }
  ]);

  return (
    <div className="devis-list">
      {userType === 'professionnel' && (
        <div className="filters">
          <select defaultValue="tous">
            <option value="tous">Tous les devis</option>
            <option value="en_attente">En attente</option>
            <option value="accepte">Acceptés</option>
            <option value="refuse">Refusés</option>
          </select>
          <input type="date" />
        </div>
      )}
      
      <table>
        <thead>
          <tr>
            <th>Référence</th>
            <th>Date</th>
            {userType === 'professionnel' && <th>Client</th>}
            {userType === 'particulier' && <th>Description</th>}
            <th>Statut</th>
            {userType === 'professionnel' && <th>Montant</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {devis.map(devis => (
            <tr key={devis.id}>
              <td>{devis.id}</td>
              <td>{devis.date}</td>
              {userType === 'professionnel' && <td>{devis.client}</td>}
              {userType === 'particulier' && <td>{devis.description}</td>}
              <td>
                {userType === 'professionnel' ? (
                  <select 
                    defaultValue={devis.status}
                    className={`status-select ${devis.status}`}
                  >
                    <option value="en_attente">En attente</option>
                    <option value="accepte">Accepté</option>
                    <option value="refuse">Refusé</option>
                  </select>
                ) : (
                  <span className={`status ${devis.status}`}>
                    {devis.status === 'en_attente' ? 'En cours de traitement' :
                     devis.status === 'accepte' ? 'Devis reçu' :
                     'Refusé'}
                  </span>
                )}
              </td>
              {userType === 'professionnel' && <td>{devis.montant}</td>}
              <td className="actions">
                <button className="action-button view">
                  {devis.messages > 0 && <span className="notification">{devis.messages}</span>}
                  Voir
                </button>
                {userType === 'particulier' && devis.status === 'accepte' && (
                  <button className="action-button accept">Valider et payer l'acompte</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MessagesContent = () => (
  <div className="messages-container">
    <div className="message-list">
      <div className="message-item unread">
        <div className="message-avatar">
          <img src="https://via.placeholder.com/40" alt="Avatar" />
        </div>
        <div className="message-content">
          <h4>Jean Dupont</h4>
          <p>Question concernant le devis...</p>
        </div>
        <div className="message-time">
          <span>Il y a 2h</span>
        </div>
      </div>
    </div>
  </div>
);

const ProfileContent = ({ userType }) => {
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
