import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import './Messages.css';
import { FaEnvelope, FaEnvelopeOpen, FaReply, FaTrash } from 'react-icons/fa';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchMessages();
  }, [currentUser]);

  const fetchMessages = async () => {
    if (!currentUser) return;

    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('recipientId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const messagesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      setMessages(messagesData);
    } catch (error) {
      console.error("Erreur lors de la récupération des messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="messages-loading">Chargement des messages...</div>;
  }

  return (
    <div className="messages-container">
      <div className="messages-header">
        <h2>Messagerie</h2>
        <p>Gérez vos messages et communications</p>
      </div>

      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="no-messages">
            <FaEnvelope size={40} />
            <p>Vous n'avez pas de messages</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`message-item ${!message.read ? 'unread' : ''}`}
            >
              <div className="message-icon">
                {message.read ? <FaEnvelopeOpen /> : <FaEnvelope />}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <h3>{message.subject}</h3>
                  <span className="message-date">{formatDate(message.timestamp)}</span>
                </div>
                <p className="message-sender">De: {message.senderName}</p>
                <p className="message-preview">{message.content}</p>
              </div>
              <div className="message-actions">
                <button className="action-button reply">
                  <FaReply />
                </button>
                <button className="action-button delete">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Messages;
