import React from 'react';

const DashboardNavigation = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="dashboard-tabs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DashboardNavigation;
