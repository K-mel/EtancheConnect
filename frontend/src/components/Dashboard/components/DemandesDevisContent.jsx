import React from 'react';
import DevisList from '../DevisList';
import '../styles/devis.css';

const DemandesDevisContent = () => {
  return (
    <div className="dashboard-content">
      <div className="content-header">
        <h2>Demandes de devis</h2>
        <p>Gérez toutes les demandes de devis de la plateforme</p>
      </div>
      <div className="content-body">
        <DevisList userType="administrateur" />
      </div>
    </div>
  );
};

export default DemandesDevisContent;
