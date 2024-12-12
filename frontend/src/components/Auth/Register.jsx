import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();

  const handleUserTypeSelection = (type) => {
    navigate(`/register/${type}`);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Inscription</h2>
        <p>Choisissez votre type de compte :</p>
        
        <div className="user-type-buttons">
          <button 
            onClick={() => handleUserTypeSelection('particulier')}
            className="user-type-btn"
          >
            Particulier
          </button>
          
          <button 
            onClick={() => handleUserTypeSelection('professionnel')}
            className="user-type-btn"
          >
            Professionnel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
