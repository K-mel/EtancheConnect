import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Register.css';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'particulier',
    displayName: '',
    companyName: '',
    siret: '',
    address: '',
    sector: '',
    phone: '',
    bankName: '',
    iban: '',
    bic: '',
    serviceDescription: '',
    workingArea: '',
    rates: '',
    acceptTerms: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState({
    idCard: null,
    kbis: null,
    insurance: null
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setDocuments(prev => ({
      ...prev,
      [name]: files[0]
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.displayName) {
      setError('Tous les champs sont obligatoires');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (formData.role === 'professionnel') {
      if (!formData.companyName || !formData.siret || !formData.address || 
          !formData.sector || !formData.phone || !formData.bankName || 
          !formData.iban || !formData.bic || !formData.serviceDescription || 
          !formData.workingArea || !formData.rates || !formData.acceptTerms) {
        setError('Tous les champs professionnels sont obligatoires');
        return false;
      }
      if (!documents.idCard || !documents.kbis || !documents.insurance) {
        setError('Tous les documents sont obligatoires');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setError('');
      setLoading(true);

      // Préparer les données utilisateur
      const userData = {
        displayName: formData.displayName,
        ...(formData.role === 'professionnel' && {
          companyName: formData.companyName,
          siret: formData.siret,
          address: formData.address,
          sector: formData.sector,
          phone: formData.phone,
          bankName: formData.bankName,
          iban: formData.iban,
          bic: formData.bic,
          serviceDescription: formData.serviceDescription,
          workingArea: formData.workingArea,
          rates: formData.rates,
          acceptTerms: formData.acceptTerms,
          documents: documents
        })
      };

      await register(formData.email, formData.password, formData.role, userData);
      navigate('/dashboard');
    } catch (err) {
      let errorMessage = 'Une erreur est survenue lors de l\'inscription.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Cette adresse email est déjà utilisée.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <Link to="/" className="brand-logo">
            EtancheConnect
          </Link>
          <h2>Créer un compte</h2>
          <p>Rejoignez notre communauté</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="account-type-selector">
          <h3>Choisissez votre type de compte</h3>
          <div className="role-selector">
            <label className={`role-option ${formData.role === 'particulier' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="role"
                value="particulier"
                checked={formData.role === 'particulier'}
                onChange={handleChange}
              />
              <div className="role-content">
                <i className="fas fa-user"></i>
                <span>Particulier</span>
                <p>Je cherche un professionnel</p>
              </div>
            </label>

            <label className={`role-option ${formData.role === 'professionnel' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="role"
                value="professionnel"
                checked={formData.role === 'professionnel'}
                onChange={handleChange}
              />
              <div className="role-content">
                <i className="fas fa-hard-hat"></i>
                <span>Professionnel</span>
                <p>Je propose mes services</p>
              </div>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {formData.role === 'professionnel' ? (
            <>
              <h3>Informations de l'entreprise</h3>
              <div className="form-group">
                <label htmlFor="companyName">Nom de l'entreprise</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="siret">Numéro SIRET</label>
                <input
                  type="text"
                  id="siret"
                  name="siret"
                  value={formData.siret}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Adresse complète</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sector">Secteur d'activité</label>
                <input
                  type="text"
                  id="sector"
                  name="sector"
                  value={formData.sector}
                  onChange={handleChange}
                  required
                />
              </div>

              <h3>Coordonnées du responsable</h3>
              <div className="form-group">
                <label htmlFor="displayName">Nom complet</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Téléphone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email professionnel</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <h3>Informations bancaires</h3>
              <div className="form-group">
                <label htmlFor="bankName">Nom de la banque</label>
                <input
                  type="text"
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="iban">IBAN</label>
                <input
                  type="text"
                  id="iban"
                  name="iban"
                  value={formData.iban}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="bic">BIC</label>
                <input
                  type="text"
                  id="bic"
                  name="bic"
                  value={formData.bic}
                  onChange={handleChange}
                  required
                />
              </div>

              <h3>Documents légaux</h3>
              <div className="form-group">
                <label htmlFor="idCard">Pièce d'identité</label>
                <input
                  type="file"
                  id="idCard"
                  name="idCard"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="kbis">Extrait Kbis</label>
                <input
                  type="file"
                  id="kbis"
                  name="kbis"
                  onChange={handleFileChange}
                  accept=".pdf"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="insurance">Attestation d'assurance</label>
                <input
                  type="file"
                  id="insurance"
                  name="insurance"
                  onChange={handleFileChange}
                  accept=".pdf"
                  required
                />
              </div>

              <h3>Conditions de prestation</h3>
              <div className="form-group">
                <label htmlFor="serviceDescription">Description des services</label>
                <textarea
                  id="serviceDescription"
                  name="serviceDescription"
                  value={formData.serviceDescription}
                  onChange={handleChange}
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="workingArea">Zone d'intervention</label>
                <input
                  type="text"
                  id="workingArea"
                  name="workingArea"
                  value={formData.workingArea}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="rates">Tarifs</label>
                <textarea
                  id="rates"
                  name="rates"
                  value={formData.rates}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Détaillez vos tarifs..."
                  required
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    required
                  />
                  J'accepte les conditions générales et la politique de commission
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="displayName">Nom complet</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button 
            type="submit" 
            className={`submit-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="register-footer">
          <p>Déjà inscrit ?</p>
          <Link to="/login" className="login-link">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
