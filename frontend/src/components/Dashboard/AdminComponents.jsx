import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { FaUserCheck, FaUserTimes, FaChartBar } from 'react-icons/fa';

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

  if (loading) {
    return <div className="loading">Chargement des utilisateurs...</div>;
  }

  return (
    <div className="users-container">
      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-header">
              <h3>{user.displayName || 'Utilisateur sans nom'}</h3>
              <span className={`role-badge role-${user.role}`}>{user.role}</span>
            </div>
            <div className="user-info">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Statut:</strong> {user.validated ? 'Validé' : 'En attente'}</p>
              <p><strong>Date d'inscription:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
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
        const pendingQuery = query(
          usersRef,
          where('role', '==', 'professionnel'),
          where('validated', '==', false)
        );
        const pendingSnap = await getDocs(pendingQuery);
        const pendingData = pendingSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPendingUsers(pendingData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des validations:', error);
        setLoading(false);
      }
    };

    fetchPendingUsers();
  }, []);

  const handleValidation = async (userId, isApproved) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        validated: isApproved,
        validatedAt: new Date().toISOString()
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
    <div className="validation-list">
      {pendingUsers.length === 0 ? (
        <div className="empty-state">
          <p>Aucune validation en attente</p>
        </div>
      ) : (
        pendingUsers.map(user => (
          <div key={user.id} className="validation-item">
            <div className="validation-info">
              <h3>{user.displayName || 'Professionnel sans nom'}</h3>
              <p>{user.email}</p>
              {user.company && <p>Entreprise: {user.company}</p>}
            </div>
            <div className="validation-actions">
              <button
                className="btn-approve"
                onClick={() => handleValidation(user.id, true)}
              >
                <FaUserCheck /> Approuver
              </button>
              <button
                className="btn-reject"
                onClick={() => handleValidation(user.id, false)}
              >
                <FaUserTimes /> Rejeter
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const StatistiquesContent = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProfessionals: 0,
    totalIndividuals: 0,
    totalProjects: 0,
    totalQuotes: 0,
    activeProjects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Compter les utilisateurs par rôle
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        const users = usersSnap.docs.map(doc => doc.data());
        
        const professionals = users.filter(user => user.role === 'professionnel').length;
        const individuals = users.filter(user => user.role === 'particulier').length;

        // Compter les projets
        const projectsRef = collection(db, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        const projects = projectsSnap.docs.map(doc => doc.data());
        
        const active = projects.filter(project => project.status === 'en_cours').length;

        // Compter les devis
        const quotesRef = collection(db, 'quotes');
        const quotesSnap = await getDocs(quotesRef);

        setStats({
          totalUsers: usersSnap.size,
          totalProfessionals: professionals,
          totalIndividuals: individuals,
          totalProjects: projectsSnap.size,
          totalQuotes: quotesSnap.size,
          activeProjects: active
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
    <div className="admin-stats">
      <div className="stat-card">
        <div className="stat-header">
          <FaChartBar />
          <h3>Utilisateurs</h3>
        </div>
        <div className="stat-value">{stats.totalUsers}</div>
        <div className="stat-details">
          <p>Professionnels: {stats.totalProfessionals}</p>
          <p>Particuliers: {stats.totalIndividuals}</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <FaChartBar />
          <h3>Projets</h3>
        </div>
        <div className="stat-value">{stats.totalProjects}</div>
        <div className="stat-details">
          <p>En cours: {stats.activeProjects}</p>
          <p>Terminés: {stats.totalProjects - stats.activeProjects}</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <FaChartBar />
          <h3>Devis</h3>
        </div>
        <div className="stat-value">{stats.totalQuotes}</div>
      </div>
    </div>
  );
};

export { UtilisateursContent, ValidationsContent, StatistiquesContent };
