import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { FaUserCheck, FaUserTimes, FaEye, FaSpinner, FaSearch } from 'react-icons/fa';
import '../styles/utilisateurs.css';

const UtilisateursContent = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      const filtered = users.filter(user => {
        const searchString = searchTerm.toLowerCase();
        return (
          (user.displayName?.toLowerCase().includes(searchString)) ||
          (user.name?.toLowerCase().includes(searchString)) ||
          user.email.toLowerCase().includes(searchString) ||
          user.role?.toLowerCase().includes(searchString) ||
          user.companyName?.toLowerCase().includes(searchString)
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      setFilteredUsers(usersData);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des utilisateurs:', err);
      setError('Une erreur est survenue lors du chargement des utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleUserAction = async (userId, action) => {
    try {
      const userRef = doc(db, 'users', userId);
      
      switch (action) {
        case 'approve':
          await updateDoc(userRef, {
            status: 'approved',
            approvedAt: new Date().toISOString()
          });
          break;
        case 'reject':
          await updateDoc(userRef, {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
          });
          break;
        case 'delete':
          if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            await deleteDoc(userRef);
          }
          break;
        default:
          break;
      }
      
      // Rafraîchir la liste des utilisateurs
      await fetchUsers();
    } catch (err) {
      console.error('Erreur lors de l\'action sur l\'utilisateur:', err);
      setError('Une erreur est survenue lors de l\'action sur l\'utilisateur.');
    }
  };

  const handleViewUser = (userId) => {
    const user = users.find(u => u.id === userId);
    setSelectedUser(user);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
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

  return (
    <div className="utilisateurs-content">
      <h2>Gestion des Utilisateurs</h2>
      
      {!selectedUser && (
        <div className="search-container">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, rôle ou entreprise..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
        </div>
      )}
      
      {selectedUser ? (
        <div className="user-details">
          <h3>Détails de l'utilisateur</h3>
          <div className="user-details-content">
            <p><strong>Nom:</strong> {selectedUser.displayName || selectedUser.name || 'Non spécifié'}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Rôle:</strong> {selectedUser.role}</p>
            <p><strong>Statut:</strong> {selectedUser.status || 'Non spécifié'}</p>
            {selectedUser.companyName && (
              <p><strong>Entreprise:</strong> {selectedUser.companyName}</p>
            )}
            <p><strong>Date d'inscription:</strong> {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <button onClick={() => setSelectedUser(null)} className="back-button">
            Retour à la liste
          </button>
        </div>
      ) : (
        <div className="users-list">
          {filteredUsers.length === 0 ? (
            <p className="no-users">
              {searchTerm ? 'Aucun utilisateur trouvé pour cette recherche' : 'Aucun utilisateur trouvé'}
            </p>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-info">
                  <span className="user-name">{user.displayName || user.name || 'Utilisateur'}</span>
                  <span className="user-email">{user.email}</span>
                  <span className={`user-role ${user.role}`}>{user.role}</span>
                  <span className={`user-status ${user.status || 'pending'}`}>
                    {user.status || 'En attente'}
                  </span>
                </div>
                <div className="user-actions">
                  <button 
                    onClick={() => handleUserAction(user.id, 'approve')}
                    className="action-button approve"
                    title="Approuver"
                  >
                    <FaUserCheck />
                  </button>
                  <button 
                    onClick={() => handleUserAction(user.id, 'reject')}
                    className="action-button reject"
                    title="Rejeter"
                  >
                    <FaUserTimes />
                  </button>
                  <button 
                    onClick={() => handleViewUser(user.id)}
                    className="action-button view"
                    title="Voir les détails"
                  >
                    <FaEye />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UtilisateursContent;
