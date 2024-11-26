import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const { currentUser } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="logo">EtancheConnect</Link>
      </div>
      <div className="navbar-menu">
        <Link to="/how-it-works">Comment ça marche</Link>
        <Link to="/about">À propos</Link>
        <Link to="/contact">Contact</Link>
        
        {!currentUser && (
          <>
            <Link to="/login" className="nav-button">Connexion</Link>
            <Link to="/register" className="nav-button primary">Inscription</Link>
          </>
        )}
        
        {currentUser && (
          <Link to="/dashboard" className="nav-button">Tableau de bord</Link>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
