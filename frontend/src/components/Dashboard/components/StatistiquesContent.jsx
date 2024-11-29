import React from 'react';
import { FaChartBar, FaUsers, FaProjectDiagram, FaFileInvoice, FaEnvelope } from 'react-icons/fa';

const StatistiquesContent = ({ stats = {} }) => {
  const defaultStats = {
    totalUsers: 0,
    totalProjects: 0,
    totalDevis: 0,
    totalMessages: 0,
    ...stats
  };

  return (
    <div className="statistiques-content">
      <h2>Statistiques</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <FaUsers className="stat-icon" />
          <h3>Utilisateurs</h3>
          <p>{defaultStats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <FaProjectDiagram className="stat-icon" />
          <h3>Projets</h3>
          <p>{defaultStats.totalProjects}</p>
        </div>
        <div className="stat-card">
          <FaFileInvoice className="stat-icon" />
          <h3>Devis</h3>
          <p>{defaultStats.totalDevis}</p>
        </div>
        <div className="stat-card">
          <FaEnvelope className="stat-icon" />
          <h3>Messages</h3>
          <p>{defaultStats.totalMessages}</p>
        </div>
      </div>
    </div>
  );
};

export default StatistiquesContent;
