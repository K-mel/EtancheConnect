import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy, getDoc } from 'firebase/firestore';
import { FaTrash, FaCheck } from 'react-icons/fa';
import '../styles/messages.css';

const MessagesContent = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getUserData = async (userId) => {
    if (!userId) return 'Utilisateur inconnu';
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role || '';
        
        let displayName = '';
        if (role === 'particulier') {
          // Pour les particuliers, utiliser le champ 'nom'
          displayName = userData.nom || 'Nom inconnu';
        } else if (role === 'professionnel') {
          // Pour les professionnels, utiliser le champ 'displayName'
          displayName = userData.displayName || 'Nom inconnu';
        } else {
          // Pour les autres rôles (admin, etc.)
          displayName = userData.displayName || userData.nom || 'Nom inconnu';
        }
        
        if (role) {
          displayName += ` (${role})`;
        }
        
        return displayName;
      }
      return 'Utilisateur inconnu';
    } catch (err) {
      console.error('Erreur lors de la récupération des données utilisateur:', err);
      return 'Utilisateur inconnu';
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const messagesRef = collection(db, 'messages');
      const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messagesPromises = messagesSnapshot.docs.map(async (doc) => {
        const messageData = doc.data();
        
        // Vérification des IDs avant de récupérer les données utilisateur
        const senderId = messageData.senderId;
        const receiverId = messageData.receiverId;
        
        const [senderName, receiverName] = await Promise.all([
          getUserData(senderId),
          getUserData(receiverId)
        ]);

        return {
          id: doc.id,
          ...messageData,
          senderName,
          receiverName,
          createdAt: messageData.createdAt?.toDate?.() || new Date()
        };
      });

      const messagesData = await Promise.all(messagesPromises);
      setMessages(messagesData);
    } catch (err) {
      setError('Erreur lors de la récupération des messages');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      setMessages(messages.filter(message => message.id !== messageId));
    } catch (err) {
      setError('Erreur lors de la suppression du message');
      console.error('Erreur:', err);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        read: true
      });
      setMessages(messages.map(message => 
        message.id === messageId ? { ...message, read: true } : message
      ));
    } catch (err) {
      setError('Erreur lors du marquage du message comme lu');
      console.error('Erreur:', err);
    }
  };

  if (loading) return <div className="messages-loading">Chargement des messages...</div>;
  if (error) return <div className="messages-error">{error}</div>;

  return (
    <div className="messages-container">
      <h2>Gestion des Messages</h2>
      <div className="messages-list">
        {messages.length === 0 ? (
          <p>Aucun message disponible</p>
        ) : (
          messages.map(message => (
            <div key={message.id} className={`message-item ${message.read ? 'read' : 'unread'}`}>
              <div className="message-header">
                <div className="message-info">
                  <span className="sender">De: {message.senderName}</span>
                  <span className="receiver">À: {message.receiverName}</span>
                  <span className="date">
                    {message.createdAt.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="message-actions">
                  {!message.read && (
                    <button 
                      onClick={() => handleMarkAsRead(message.id)}
                      className="action-button read-button"
                      title="Marquer comme lu"
                    >
                      <FaCheck />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteMessage(message.id)}
                    className="action-button delete-button"
                    title="Supprimer"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className="message-content">
                {message.content || 'Aucun contenu'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessagesContent;
