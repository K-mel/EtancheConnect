import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FaEnvelope } from 'react-icons/fa';

const Messages = ({ userRole }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchMessages();
    }
  }, [currentUser]);

  const fetchMessages = async () => {
    if (!currentUser) return;

    try {
      const messagesRef = collection(db, 'messages');
      
      // Première requête pour obtenir les IDs des messages
      const participantsQuery = query(
        messagesRef,
        where('participants', 'array-contains', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(participantsQuery);
      const messagesData = [];
      const userIds = new Set();

      // Trier les messages par timestamp côté client
      const sortedMessages = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      sortedMessages.forEach((messageData) => {
        messagesData.push(messageData);
        const otherUserId = messageData.senderId === currentUser.uid 
          ? messageData.recipientId 
          : messageData.senderId;
        userIds.add(otherUserId);
      });

      // Récupérer les informations des utilisateurs
      const usersData = {};
      for (const userId of userIds) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          usersData[userId] = userData;
        }
      }

      setUsers(usersData);
      setMessages(messagesData);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des messages:", error);
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !recipientId) return;

    try {
      const messagesRef = collection(db, 'messages');
      const messageData = {
        content: newMessage.trim(),
        senderId: currentUser.uid,
        recipientId: recipientId,
        timestamp: new Date().toISOString(),
        read: false,
        participants: [currentUser.uid, recipientId]
      };

      await addDoc(messagesRef, messageData);
      setNewMessage('');
      setRecipientId('');
      fetchMessages();
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement des messages...</div>;
  }

  return (
    <div className="messages-container">
      <div className="messages-list">
        <h3>Conversations</h3>
        {messages.length === 0 ? (
          <div className="no-messages" style={{ padding: '20px', textAlign: 'center' }}>
            <FaEnvelope size={40} style={{ marginBottom: '10px', color: '#6c757d' }} />
            <p>Aucun message</p>
          </div>
        ) : (
          <div className="messages-items">
            {messages.map((message) => {
              const otherUserId = message.senderId === currentUser.uid ? message.recipientId : message.senderId;
              const otherUser = users[otherUserId];

              return (
                <div
                  key={message.id}
                  className={`message-preview ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMessage(message)}
                  style={{ cursor: 'pointer', padding: '15px', borderBottom: '1px solid #eee' }}
                >
                  <div className="message-preview-header">
                    <span className="user-name" style={{ fontWeight: 'bold' }}>
                      {message.senderId === currentUser.uid ? 'Moi' : otherUser?.displayName || otherUser?.companyName || 'Utilisateur'}
                    </span>
                    <span className="message-date" style={{ color: '#666' }}>
                      {new Date(message.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="message-preview-content">
                    <p style={{ 
                      margin: '5px 0',
                      color: message.read ? '#666' : '#000',
                      fontWeight: message.read ? 'normal' : 'bold'
                    }}>
                      {message.content}
                    </p>
                  </div>
                  {!message.read && message.recipientId === currentUser.uid && (
                    <div className="message-status" style={{ 
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      alignSelf: 'flex-start',
                      marginTop: '5px'
                    }}>
                      Nouveau
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedMessage && (
        <div className="message-detail">
          {/* Détails du message sélectionné */}
        </div>
      )}
    </div>
  );
};

export default Messages;
