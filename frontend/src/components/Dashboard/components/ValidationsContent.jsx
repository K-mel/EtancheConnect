import React from 'react';
import { FaCheck, FaTimes, FaEye } from 'react-icons/fa';

const ValidationsContent = ({ validations, handleValidation, handleViewValidation }) => {
  return (
    <div className="validations-content">
      <h2>Validations en Attente</h2>
      <div className="validations-list">
        {validations.map((validation) => (
          <div key={validation.id} className="validation-item">
            <div className="validation-info">
              <span>{validation.type}</span>
              <span>{validation.date}</span>
              <span>{validation.status}</span>
            </div>
            <div className="validation-actions">
              <button onClick={() => handleValidation(validation.id, 'approve')}>
                <FaCheck />
              </button>
              <button onClick={() => handleValidation(validation.id, 'reject')}>
                <FaTimes />
              </button>
              <button onClick={() => handleViewValidation(validation.id)}>
                <FaEye />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidationsContent;
