import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaUser,
  FaUserTie,
  FaUsers,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBuilding,
  FaIdCard,
  FaTools,
  FaFileAlt,
  FaMoneyBillWave,
  FaUniversity,
  FaFileContract,
  FaUserClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaEdit,
  FaSave,
  FaTimes,
  FaEye
} from 'react-icons/fa';

const ProfileContent = ({ userRole }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    companyName: '',
    siret: '',
    sector: '',
    workingArea: '',
    serviceDescription: '',
    rates: '',
    bankName: '',
    iban: '',
    bic: '',
    documents: {
      idCard: { contentType: '', fileName: '', uploadedAt: '', url: '' },
      insurance: { contentType: '', fileName: '', uploadedAt: '', url: '' },
      kbis: { contentType: '', fileName: '', uploadedAt: '', url: '' }
    },
    status: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        setError('Erreur lors de la récupération des données');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          ...userData,
          updatedAt: serverTimestamp()
        });
        setSuccess('Profil mis à jour avec succès !');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du profil:', err);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>
          {userData.role === 'professionnel' ? (
            <><FaUserTie /> Profil Professionnel</>
          ) : (
            <><FaUsers /> Profil Particulier</>
          )}
        </h2>
        {!isEditing && (
          <button className="edit-button" onClick={() => setIsEditing(true)}>
            <FaEdit /> Modifier
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <FaExclamationCircle /> {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <FaCheckCircle /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="profile-section">
          <h3><FaUser /> Informations Personnelles</h3>
          <div className="form-grid">
            <div className="form-group">
              <label><FaUserTie /> Nom complet</label>
              <input
                type="text"
                name="displayName"
                value={userData.displayName}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Votre nom complet"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label><FaEnvelope /> Email</label>
              <input
                type="email"
                name="email"
                value={userData.email}
                disabled={true}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label><FaPhone /> Téléphone</label>
              <input
                type="tel"
                name="phone"
                value={userData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Votre numéro de téléphone"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label><FaMapMarkerAlt /> Adresse</label>
              <textarea
                name="address"
                value={userData.address}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Votre adresse complète"
                className="form-control"
              />
            </div>
          </div>
        </div>

        {userData.role === 'professionnel' && (
          <>
            <div className="profile-section">
              <h3><FaBuilding /> Informations Professionnelles</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label><FaBuilding /> Nom de l'entreprise</label>
                  <input
                    type="text"
                    name="companyName"
                    value={userData.companyName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Nom de votre entreprise"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label><FaIdCard /> SIRET</label>
                  <input
                    type="text"
                    name="siret"
                    value={userData.siret}
                    disabled={true}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label><FaTools /> Secteur d'activité</label>
                  <input
                    type="text"
                    name="sector"
                    value={userData.sector}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Votre secteur d'activité"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label><FaMapMarkerAlt /> Zone d'intervention</label>
                  <input
                    type="text"
                    name="workingArea"
                    value={userData.workingArea}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Votre zone d'intervention"
                    className="form-control"
                  />
                </div>

                <div className="form-group full-width">
                  <label><FaFileAlt /> Description des services</label>
                  <textarea
                    name="serviceDescription"
                    value={userData.serviceDescription}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Décrivez vos services..."
                    className="form-control"
                    rows="4"
                  />
                </div>

                <div className="form-group full-width">
                  <label><FaMoneyBillWave /> Tarifs</label>
                  <textarea
                    name="rates"
                    value={userData.rates}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Détaillez vos tarifs..."
                    className="form-control"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3><FaUniversity /> Informations Bancaires</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom de la banque</label>
                  <input
                    type="text"
                    name="bankName"
                    value={userData.bankName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Nom de votre banque"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>IBAN</label>
                  <input
                    type="text"
                    name="iban"
                    value={userData.iban}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="IBAN"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>BIC</label>
                  <input
                    type="text"
                    name="bic"
                    value={userData.bic}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="BIC"
                    className="form-control"
                  />
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3><FaFileAlt /> Documents</h3>
              <div className="documents-grid">
                <div className="document-card">
                  <div className="document-icon">
                    <FaIdCard />
                  </div>
                  <div className="document-info">
                    <h4>Carte d'identité</h4>
                    {userData.documents?.idCard?.uploadedAt && (
                      <p className="document-date">
                        Mis à jour le {new Date(userData.documents.idCard.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                    {userData.documents?.idCard?.url ? (
                      <a
                        href={userData.documents.idCard.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        <FaEye /> Voir le document
                      </a>
                    ) : (
                      <p className="document-missing">Document non fourni</p>
                    )}
                  </div>
                </div>

                <div className="document-card">
                  <div className="document-icon">
                    <FaFileContract />
                  </div>
                  <div className="document-info">
                    <h4>Assurance</h4>
                    {userData.documents?.insurance?.uploadedAt && (
                      <p className="document-date">
                        Mis à jour le {new Date(userData.documents.insurance.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                    {userData.documents?.insurance?.url ? (
                      <a
                        href={userData.documents.insurance.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        <FaEye /> Voir le document
                      </a>
                    ) : (
                      <p className="document-missing">Document non fourni</p>
                    )}
                  </div>
                </div>

                <div className="document-card">
                  <div className="document-icon">
                    <FaFileAlt />
                  </div>
                  <div className="document-info">
                    <h4>KBIS</h4>
                    {userData.documents?.kbis?.uploadedAt && (
                      <p className="document-date">
                        Mis à jour le {new Date(userData.documents.kbis.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                    {userData.documents?.kbis?.url ? (
                      <a
                        href={userData.documents.kbis.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        <FaEye /> Voir le document
                      </a>
                    ) : (
                      <p className="document-missing">Document non fourni</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-status">
              <div className={`status-badge status-${userData.status || 'pending'}`}>
                <FaUserClock />
                <span>Status: {userData.status ? userData.status.charAt(0).toUpperCase() + userData.status.slice(1) : 'En attente'}</span>
              </div>
            </div>
          </>
        )}

        {isEditing && (
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <FaSave /> Enregistrer
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditing(false)}
            >
              <FaTimes /> Annuler
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProfileContent;
