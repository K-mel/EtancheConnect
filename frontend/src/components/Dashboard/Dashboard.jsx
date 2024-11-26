import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './Dashboard.css';

const Dashboard = ({ userType = 'particulier' }) => {
  const [activeTab, setActiveTab] = useState('apercu');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>{getMenuItems().find(item => item.id === activeTab)?.label}</h1>
          <div className="user-menu">
            <span className="notification-badge">🔔</span>
            <span className="user-name">{user?.displayName || 'Utilisateur'}</span>
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
  const [userData, setUserData] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Récupérer les données de l'utilisateur au chargement
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              displayName: currentUser.displayName || '',
              email: currentUser.email || '',
              phone: data.phone || '',
              address: data.address || ''
            });
          }
        }
        setLoading(false);
      } catch (err) {
        setError('Erreur lors de la récupération des données');
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Gérer les changements dans les champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Sauvegarder les modifications
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Mettre à jour le profil Firebase Auth
        await updateProfile(currentUser, {
          displayName: userData.displayName
        });

        // Mettre à jour les données supplémentaires dans Firestore
        await setDoc(doc(db, 'users', currentUser.uid), {
          phone: userData.phone,
          address: userData.address,
          userType: userType
        }, { merge: true });

        setSuccess('Profil mis à jour avec succès !');
        setIsEditing(false);
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <img src="https://via.placeholder.com/100" alt="Profile" />
        </div>
        <div className="profile-info">
          <h2>{userData.displayName || 'Utilisateur'}</h2>
          <p>{userType === 'professionnel' ? 'Professionnel' : 'Particulier'}</p>
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
              value={userData.displayName}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={userData.email}
              readOnly
            />
          </div>
          <div className="form-group">
            <label>Téléphone</label>
            <input
              type="tel"
              name="phone"
              value={userData.phone}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="form-group">
            <label>Adresse</label>
            <textarea
              name="address"
              value={userData.address}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
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
  );
};

export default Dashboard;
