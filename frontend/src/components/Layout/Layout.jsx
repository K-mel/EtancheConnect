import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

function Layout() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-brand">
            <Link to="/">Mon App</Link>
          </div>
          <div className="nav-links">
            <Link to="/">Accueil</Link>
            <Link to="/contact">Contact</Link>
            {currentUser ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <button onClick={logout} className="nav-button">Déconnexion</button>
              </>
            ) : (
              <>
                <Link to="/login">Connexion</Link>
                <Link to="/register">Inscription</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
