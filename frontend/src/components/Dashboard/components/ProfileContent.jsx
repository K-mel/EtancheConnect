import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const ProfileContent = () => {
  const { currentUser } = useAuth();

  return (
    <div className="profile-container">
      <h2>Mon Profil</h2>
      <div className="profile-info">
        <p><strong>Email:</strong> {currentUser?.email}</p>
      </div>
    </div>
  );
};

export default ProfileContent;
