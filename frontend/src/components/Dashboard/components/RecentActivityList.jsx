import React from 'react';
import { FaBell, FaFileInvoice, FaEnvelope, FaUser } from 'react-icons/fa';
import '../styles/recentActivity.css';

const RecentActivityList = ({ activities }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'devis':
        return <FaFileInvoice />;
      case 'message':
        return <FaEnvelope />;
      case 'user':
        return <FaUser />;
      default:
        return <FaBell />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'devis':
        return '#4CAF50';
      case 'message':
        return '#2196F3';
      case 'user':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <div className="recent-activity">
      <h3>Activités Récentes</h3>
      <div className="activity-list">
        {activities && activities.length > 0 ? (
          activities.map((activity, index) => (
            <div key={index} className="activity-item">
              <div 
                className="activity-icon" 
                style={{ backgroundColor: `${getActivityColor(activity.type)}20`, color: getActivityColor(activity.type) }}
              >
                {getActivityIcon(activity.type)}
              </div>
              <div className="activity-content">
                <h4>{activity.title}</h4>
                <p>{activity.description}</p>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="no-activity">Aucune activité récente</p>
        )}
      </div>
    </div>
  );
};

export default RecentActivityList;
