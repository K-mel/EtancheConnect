import React from 'react';
import { FaUserCheck, FaUserTimes, FaEye } from 'react-icons/fa';

const UtilisateursContent = ({ users, handleUserAction, handleViewUser }) => {
  return (
    <div className="utilisateurs-content">
      <h2>Gestion des Utilisateurs</h2>
      <div className="users-list">
        {users.map((user) => (
          <div key={user.id} className="user-item">
            <div className="user-info">
              <span>{user.name}</span>
              <span>{user.email}</span>
              <span>{user.role}</span>
            </div>
            <div className="user-actions">
              <button onClick={() => handleUserAction(user.id, 'approve')}>
                <FaUserCheck />
              </button>
              <button onClick={() => handleUserAction(user.id, 'reject')}>
                <FaUserTimes />
              </button>
              <button onClick={() => handleViewUser(user.id)}>
                <FaEye />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UtilisateursContent;
