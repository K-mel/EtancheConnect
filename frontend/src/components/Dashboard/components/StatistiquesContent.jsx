import React from 'react';
import { FaChartBar } from 'react-icons/fa';

const StatistiquesContent = ({ stats }) => {
  return (
    <div className="statistiques-content">
      <h2>Statistiques</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <FaChartBar />
          <h3>Utilisateurs</h3>
          <p>{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <FaChartBar />
          <h3>Projets</h3>
          <p>{stats.totalProjects}</p>
        </div>
        <div className="stat-card">
          <FaChartBar />
          <h3>Devis</h3>
          <p>{stats.totalDevis}</p>
        </div>
        <div className="stat-card">
          <FaChartBar />
          <h3>Messages</h3>
          <p>{stats.totalMessages}</p>
        </div>
      </div>
    </div>
  );
};

export default StatistiquesContent;
