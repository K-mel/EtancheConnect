import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const ProfileAdmin = () => {
  const { currentUser } = useAuth();

  return (
    <div className="profile-admin-container">
      <h2>Profil Administrateur</h2>
      <div className="profile-info">
        <p><strong>Email:</strong> {currentUser?.email}</p>
        <p><strong>Rôle:</strong> Administrateur</p>
      </div>
    </div>
  );
};

export default ProfileAdmin;
