import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Vérifiez votre boîte mail pour les instructions de réinitialisation.');
    } catch (err) {
      let errorMessage = 'Une erreur est survenue lors de l\'envoi du mail de réinitialisation.';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte ne correspond à cette adresse email.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h2>Réinitialisation du mot de passe</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Votre email"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Envoi en cours...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login" className="back-to-login">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
