import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaUser, FaUserTie, FaUsers, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaBuilding, FaIdCard, FaTools, FaFileAlt, FaMoneyBillWave,
  FaUniversity, FaFileContract, FaUserClock, FaCheckCircle,
  FaExclamationCircle, FaEdit, FaSave, FaTimes, FaEye
} from 'react-icons/fa';
import './ProfileContent.css';

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
                value={userData.displayName || ''}
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
                value={userData.email || ''}
                disabled={true}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label><FaPhone /> Téléphone</label>
              <input
                type="tel"
                name="phone"
                value={userData.phone || ''}
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
                value={userData.address || ''}
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
                    value={userData.companyName || ''}
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
                    value={userData.siret || ''}
                    disabled={true}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label><FaTools /> Secteur d'activité</label>
                  <input
                    type="text"
                    name="sector"
                    value={userData.sector || ''}
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
                    value={userData.workingArea || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Votre zone d'intervention"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label><FaFileAlt /> Description des services</label>
                  <textarea
                    name="serviceDescription"
                    value={userData.serviceDescription || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Description de vos services"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label><FaMoneyBillWave /> Tarifs</label>
                  <textarea
                    name="rates"
                    value={userData.rates || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Vos tarifs"
                    className="form-control"
                  />
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3><FaUniversity /> Informations Bancaires</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label><FaUniversity /> Nom de la banque</label>
                  <input
                    type="text"
                    name="bankName"
                    value={userData.bankName || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Nom de votre banque"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label><FaFileContract /> IBAN</label>
                  <input
                    type="text"
                    name="iban"
                    value={userData.iban || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Votre IBAN"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label><FaFileContract /> BIC</label>
                  <input
                    type="text"
                    name="bic"
                    value={userData.bic || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Votre BIC"
                    className="form-control"
                  />
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3><FaFileAlt /> Documents</h3>
              <div className="documents-section">
                {Object.entries(userData.documents || {}).map(([docType, doc]) => (
                  <div key={docType} className="document-card">
                    <div className="document-info">
                      <FaFileAlt className="document-icon" />
                      <div className="document-details">
                        <h4>{docType === 'idCard' ? "Pièce d'identité" : 
                             docType === 'insurance' ? "Attestation d'assurance" : 
                             docType === 'kbis' ? "Extrait Kbis" : docType}</h4>
                        {doc.uploadedAt && (
                          <p>Mis à jour le {new Date(doc.uploadedAt.seconds * 1000).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="document-actions">
                      {doc.url && (
                        <button
                          type="button"
                          className="document-button view"
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          <FaEye />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {isEditing && (
          <div className="button-group">
            <button type="submit" className="save-button">
              <FaSave /> Enregistrer
            </button>
            <button
              type="button"
              className="cancel-button"
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
