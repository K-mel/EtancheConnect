import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { FaSearch, FaUser, FaEnvelope, FaPhone, FaBuilding, FaArrowLeft, FaCalendarAlt } from 'react-icons/fa';
import '../styles/utilisateurs.css';

const UtilisateursContent = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setError('');
    } catch (err) {
      console.error('Erreur lors de la récupération des utilisateurs:', err);
      setError('Une erreur est survenue lors du chargement des utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users
    .filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.role?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Convertir les timestamps en dates pour la comparaison
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      // Trier du plus récent au plus ancien
      return dateB - dateA;
    });

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  const handleBackClick = () => {
    setSelectedUser(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Non disponible';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const normalizeRole = (role) => {
    if (!role) return 'particulier';
    const normalizedRole = role.toLowerCase().trim();
    return normalizedRole === 'professionnel' ? 'professionnel' : 'particulier';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={fetchUsers}>Réessayer</button>
      </div>
    );
  }

  if (selectedUser) {
    return (
      <div className="user-details">
        <button className="back-button" onClick={handleBackClick}>
          <FaArrowLeft /> Retour à la liste
        </button>
        <h3>Détails de l'utilisateur</h3>
        <div className="user-details-content">
          <div className="user-details-section">
            <h4>Informations personnelles</h4>
            <p><FaUser /> Nom: {selectedUser.displayName || 'Non renseigné'}</p>
            <p><FaEnvelope /> Email: {selectedUser.email}</p>
            <p><FaPhone /> Téléphone: {selectedUser.phone || 'Non renseigné'}</p>
            <p>Rôle: <span className={`role-badge ${normalizeRole(selectedUser.role)}`}>{normalizeRole(selectedUser.role) === 'professionnel' ? 'Professionnel' : 'Particulier'}</span></p>
            <p><FaCalendarAlt /> Date d'inscription: {formatDate(selectedUser.createdAt)}</p>
          </div>

          {normalizeRole(selectedUser.role) === 'professionnel' && (
            <div className="user-details-section">
              <h4>Informations professionnelles</h4>
              <p><FaBuilding /> Entreprise: {selectedUser.companyName || 'Non renseigné'}</p>
              <p>SIRET: {selectedUser.siret || 'Non renseigné'}</p>
              <p>Secteur: {selectedUser.sector || 'Non renseigné'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="utilisateurs-content">
      <div className="users-header">
        <h2>Utilisateurs</h2>
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="user-item" onClick={() => handleUserClick(user)}>
              <div className="user-info">
                <div className="user-avatar">
                  <FaUser />
                </div>
                <div className="user-details-preview">
                  <span className="user-name">{user.displayName || 'Utilisateur'}</span>
                  <span className="user-email">{user.email}</span>
                  <div className="user-meta">
                    <span className={`user-role ${normalizeRole(user.role)}`}>
                      {normalizeRole(user.role) === 'professionnel' ? 'Professionnel' : 'Particulier'}
                    </span>
                    <span className="user-date">
                      <FaCalendarAlt /> {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UtilisateursContent;
