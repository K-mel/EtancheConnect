import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy, getDoc, where, Timestamp } from 'firebase/firestore';
import { FaTrash, FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import '../styles/messages.css';

const MessagesContent = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const getUserData = async (userId) => {
    if (!userId) return 'Utilisateur inconnu';
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role || '';
        
        let displayName = '';
        if (role === 'particulier') {
          displayName = userData.nom || 'Nom inconnu';
        } else if (role === 'professionnel') {
          displayName = userData.displayName || 'Nom inconnu';
        } else {
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    
    // Si c'est déjà un objet Date
    if (timestamp instanceof Date) return timestamp;
    
    // Si c'est un timestamp Firestore
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Si c'est un timestamp en secondes ou millisecondes
    if (typeof timestamp === 'number') {
      // Convertir les secondes en millisecondes si nécessaire
      const milliseconds = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
      return new Date(milliseconds);
    }
    
    // Par défaut, retourner la date actuelle
    return new Date();
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const messagesRef = collection(db, 'messages');
      
      // Simplifier la requête pour éviter l'erreur d'index
      const messagesQuery = query(
        messagesRef,
        where('status', '==', 'pending')
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesPromises = messagesSnapshot.docs.map(async (doc) => {
        const messageData = doc.data();
        const senderName = await getUserData(messageData.senderId);
        const receiverName = await getUserData(messageData.receiverId);
        
        return {
          id: doc.id,
          ...messageData,
          senderName,
          receiverName,
          timestamp: formatTimestamp(messageData.timestamp)
        };
      });

      const messagesData = await Promise.all(messagesPromises);
      // Trier les messages côté client
      const sortedMessages = messagesData.sort((a, b) => b.timestamp - a.timestamp);
      
      setMessages(sortedMessages);
      if (sortedMessages.length > 0 && !selectedMessage) {
        setSelectedMessage(sortedMessages[0]);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des messages:', err);
      setError('Une erreur est survenue lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSelectMessage = (message) => {
    console.log('Message sélectionné:', message);
    setSelectedMessage(message);
  };

  const handleApproveMessage = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        status: 'approved',
        approvedAt: Timestamp.now()
      });
      
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Erreur lors de l\'approbation:', err);
      alert('Erreur lors de l\'approbation du message');
    }
  };

  const handleRejectMessage = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now()
      });
      
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Erreur lors du rejet:', err);
      alert('Erreur lors du rejet du message');
    }
  };

  return (
    <div className="messages-container">
      <div className="messages-content">
        <div className="messages-list">
          {loading ? (
            <div className="messages-loading">
              <p>Chargement des messages...</p>
            </div>
          ) : error ? (
            <div className="messages-error">
              <p>{error}</p>
              <button className="retry-button" onClick={fetchMessages}>
                Réessayer
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="messages-empty">
              <p>Aucun message en attente</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`conversation-preview ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                onClick={() => handleSelectMessage(message)}
              >
                <div className="conversation-header">
                  <div className="conversation-participants">
                    <div className="conversation-sender">De: {message.senderName}</div>
                    <div className="conversation-receiver">À: {message.receiverName}</div>
                  </div>
                  <div className="conversation-time">
                    {message.timestamp.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className="conversation-preview-text">
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="message-detail">
          {selectedMessage ? (
            <>
              <div className="message-detail-header">
                <h3>{selectedMessage.senderName}</h3>
              </div>
              <div className="message-detail-content">
                <div className="message-bubble">
                  <div className="message-info">
                    <span>{selectedMessage.senderName}</span>
                    <span>
                      {selectedMessage.timestamp.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="message-text">{selectedMessage.content}</div>
                </div>
                <div className="message-actions">
                  <button
                    className="action-button approve-button"
                    onClick={() => handleApproveMessage(selectedMessage.id)}
                  >
                    <FaCheck /> Approuver
                  </button>
                  <button
                    className="action-button reject-button"
                    onClick={() => handleRejectMessage(selectedMessage.id)}
                  >
                    <FaTimes /> Rejeter
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="message-detail-empty">
              <p>Sélectionnez un message pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesContent;
