import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaEdit, FaSave, FaTimes, FaUser, FaBuilding, FaPhone, FaEnvelope, FaIdCard } from 'react-icons/fa';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setEditedData(data);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données utilisateur:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), editedData);
      setUserData(editedData);
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
    }
  };

  const handleCancel = () => {
    setEditedData(userData);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-header loading">
          <div className="profile-avatar loading"></div>
          <div className="profile-header-content">
            <h1 className="loading"></h1>
            <p className="loading"></p>
          </div>
        </div>
        <div className="profile-content loading"></div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <img 
            src={userData.photoURL || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=80'} 
            alt="Avatar" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=80';
            }}
          />
        </div>
        <div className="profile-header-content">
          <h1>{userData.displayName || 'Utilisateur'}</h1>
          <p>{userData.email}</p>
          <span className="profile-status">{userData.role}</span>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>Informations Personnelles</h2>
          {!isEditing ? (
            <>
              <div className="form-group">
                <label><FaUser /> Nom</label>
                <input 
                  type="text" 
                  value={userData.nom || ''} 
                  readOnly 
                />
              </div>
              <div className="form-group">
                <label><FaUser /> Prénom</label>
                <input 
                  type="text" 
                  value={userData.prenom || ''} 
                  readOnly 
                />
              </div>
              <div className="form-group">
                <label><FaPhone /> Téléphone</label>
                <input 
                  type="text" 
                  value={userData.telephone || ''} 
                  readOnly 
                />
              </div>
              <div className="form-group">
                <label><FaEnvelope /> Email</label>
                <input 
                  type="email" 
                  value={userData.email || ''} 
                  readOnly 
                />
              </div>
              {userData.role === 'professionnel' && (
                <div className="profile-section">
                  <h2>Informations Professionnelles</h2>
                  <div className="form-group">
                    <label><FaBuilding /> Entreprise</label>
                    <input 
                      type="text" 
                      value={userData.entreprise || ''} 
                      readOnly 
                    />
                  </div>
                  <div className="form-group">
                    <label><FaIdCard /> SIRET</label>
                    <input 
                      type="text" 
                      value={userData.siret || ''} 
                      readOnly 
                    />
                  </div>
                </div>
              )}
              <div className="profile-actions">
                <button className="edit-button" onClick={() => setIsEditing(true)}>
                  <FaEdit /> Modifier
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label><FaUser /> Nom</label>
                <input 
                  type="text" 
                  name="nom"
                  value={editedData.nom || ''} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label><FaUser /> Prénom</label>
                <input 
                  type="text" 
                  name="prenom"
                  value={editedData.prenom || ''} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label><FaPhone /> Téléphone</label>
                <input 
                  type="text" 
                  name="telephone"
                  value={editedData.telephone || ''} 
                  onChange={handleInputChange}
                />
              </div>
              {userData.role === 'professionnel' && (
                <div className="profile-section">
                  <h2>Informations Professionnelles</h2>
                  <div className="form-group">
                    <label><FaBuilding /> Entreprise</label>
                    <input 
                      type="text" 
                      name="entreprise"
                      value={editedData.entreprise || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label><FaIdCard /> SIRET</label>
                    <input 
                      type="text" 
                      name="siret"
                      value={editedData.siret || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}
              <div className="profile-actions">
                <button className="save-button" onClick={handleSave}>
                  <FaSave /> Enregistrer
                </button>
                <button className="cancel-button" onClick={handleCancel}>
                  <FaTimes /> Annuler
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
