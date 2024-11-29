import React from 'react';

const Messages = ({ userRole }) => {
  return (
    <div className="messages-container">
      <h2>Messages</h2>
      <div className="messages-list">
        <p>Aucun message pour le moment</p>
      </div>
    </div>
  );
};

export default Messages;
