import React from 'react';
import AperçuContent from './AperçuContent';
import DevisContent from './DevisContent';
import Messages from '../Messages/Messages';
import UtilisateursContent from './UtilisateursContent';
import ParametresContent from './ParametresContent';

const DashboardContent = ({ activeTab }) => {
  const getContent = () => {
    switch (activeTab) {
      case 'apercu':
        return <AperçuContent />;
      case 'devis':
        return <DevisContent />;
      case 'messages':
        return <Messages />;
      case 'utilisateurs':
        return <UtilisateursContent />;
      case 'parametres':
        return <ParametresContent />;
      default:
        return <AperçuContent />;
    }
  };

  return (
    <div className="dashboard-content">
      {getContent()}
    </div>
  );
};

export default DashboardContent;
