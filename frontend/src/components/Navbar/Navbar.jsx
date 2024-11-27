import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { currentUser, userType, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'Utilisateur';
    return currentUser.displayName || 'Utilisateur';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">EtancheConnect</Link>
      </div>
      <div className="navbar-menu">
        {currentUser ? (
          <>
            <span className="user-name">{getUserDisplayName()}</span>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="login-button">Connexion</Link>
            <Link to="/signup" className="signup-button">Inscription</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
