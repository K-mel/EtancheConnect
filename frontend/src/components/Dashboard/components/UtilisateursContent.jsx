import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { FaUserCheck, FaUserTimes, FaEye, FaSpinner, FaSearch, FaFilter, FaChartBar, FaSortAmountDown } from 'react-icons/fa';
import '../styles/utilisateurs.css';

const UtilisateursContent = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    dateRange: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      updateStats();
      applyFiltersAndSort();
    }
  }, [searchTerm, filters, sortConfig, users]);

  const updateStats = () => {
    const newStats = users.reduce((acc, user) => {
      acc.total++;
      acc[user.status || 'pending']++;
      return acc;
    }, { total: 0, approved: 0, pending: 0, rejected: 0 });
    setStats(newStats);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...users];

    // Apply search
    if (searchTerm) {
      const searchString = searchTerm.toLowerCase();
      filtered = filtered.filter(user => {
        return (
          (user.displayName?.toLowerCase().includes(searchString)) ||
          (user.name?.toLowerCase().includes(searchString)) ||
          user.email.toLowerCase().includes(searchString) ||
          user.role?.toLowerCase().includes(searchString) ||
          user.companyName?.toLowerCase().includes(searchString)
        );
      });
    }

    // Apply filters
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }
    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
    }
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const ranges = {
        'week': 7,
        'month': 30,
        'quarter': 90
      };
      const days = ranges[filters.dateRange];
      if (days) {
        filtered = filtered.filter(user => {
          const createdAt = new Date(user.createdAt);
          const diffTime = Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24));
          return diffTime <= days;
        });
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
  };

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

  const handleSort = (key) => {
    setSortConfig(prevSort => ({
      key,
      direction: prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
      <div className="users-header">
        <h2>Gestion des Utilisateurs</h2>
        <div className="stats-container">
          <div className="stat-item">
            <FaChartBar />
            <span>Total: {stats.total}</span>
          </div>
          <div className="stat-item approved">
            <span>Actifs: {stats.approved}</span>
          </div>
          <div className="stat-item pending">
            <span>En attente: {stats.pending}</span>
          </div>
          <div className="stat-item rejected">
            <span>Rejetés: {stats.rejected}</span>
          </div>
        </div>
      </div>

      {!selectedUser && (
        <>
          <div className="search-section">
            <div className="search-header">
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
              <button 
                className="filter-toggle"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <FaFilter />
                Filtres avancés
              </button>
            </div>

            {showAdvancedFilters && (
              <div className="advanced-filters">
                <div className="filter-group">
                  <label>Rôle</label>
                  <select 
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                  >
                    <option value="">Tous</option>
                    <option value="admin">Admin</option>
                    <option value="user">Utilisateur</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Statut</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">Tous</option>
                    <option value="approved">Approuvé</option>
                    <option value="pending">En attente</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Période</label>
                  <select 
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  >
                    <option value="all">Tout</option>
                    <option value="week">7 derniers jours</option>
                    <option value="month">30 derniers jours</option>
                    <option value="quarter">90 derniers jours</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="sort-controls">
            <button 
              className={`sort-button ${sortConfig.key === 'createdAt' ? 'active' : ''}`}
              onClick={() => handleSort('createdAt')}
            >
              <FaSortAmountDown />
              Date {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </>
      )}
      
      {selectedUser ? (
        <div className="user-details">
          <h3>Détails de l'utilisateur</h3>
          <div className="user-details-content">
            <div className="user-details-section">
              <h4>Informations personnelles</h4>
              <p><strong>Nom:</strong> {selectedUser.displayName || selectedUser.name || 'Non spécifié'}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Rôle:</strong> <span className={`role-badge ${selectedUser.role}`}>{selectedUser.role}</span></p>
              <p><strong>Statut:</strong> <span className={`status-badge ${selectedUser.status || 'pending'}`}>
                {selectedUser.status || 'En attente'}
              </span></p>
            </div>
            
            <div className="user-details-section">
              <h4>Informations professionnelles</h4>
              {selectedUser.companyName && (
                <p><strong>Entreprise:</strong> {selectedUser.companyName}</p>
              )}
              <p><strong>Date d'inscription:</strong> {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}</p>
              {selectedUser.lastLogin && (
                <p><strong>Dernière connexion:</strong> {new Date(selectedUser.lastLogin).toLocaleDateString('fr-FR')}</p>
              )}
            </div>

            <div className="user-actions-panel">
              <button 
                onClick={() => handleUserAction(selectedUser.id, 'approve')}
                className="action-button approve"
              >
                <FaUserCheck /> Approuver
              </button>
              <button 
                onClick={() => handleUserAction(selectedUser.id, 'reject')}
                className="action-button reject"
              >
                <FaUserTimes /> Rejeter
              </button>
            </div>
          </div>
          <button onClick={() => setSelectedUser(null)} className="back-button">
            Retour à la liste
          </button>
        </div>
      ) : (
        <div className="users-list">
          {filteredUsers.length === 0 ? (
            <p className="no-users">
              {searchTerm || Object.values(filters).some(v => v) 
                ? 'Aucun utilisateur trouvé avec les critères sélectionnés' 
                : 'Aucun utilisateur trouvé'}
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
