import React from 'react';
import DevisList from '../DevisList';

const DevisContent = ({ devis, handleDevisAction }) => {
  return (
    <div className="devis-content">
      <h2>Gestion des Devis</h2>
      <DevisList devis={devis} onDevisAction={handleDevisAction} />
    </div>
  );
};

export default DevisContent;
