import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy, getDoc, where, Timestamp } from 'firebase/firestore';
import { FaTrash, FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import './MessagesContent.css';

const MessagesContent = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSenderId, setSelectedSenderId] = useState(null);

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

  const handleSelectSender = (senderId) => {
    console.log('Sender selected:', senderId);
    setSelectedSenderId(senderId === selectedSenderId ? null : senderId);
  };

  const groupMessagesBySender = (messages) => {
    const grouped = messages.reduce((acc, message) => {
      const key = message.senderId;
      if (!acc[key]) {
        acc[key] = {
          senderId: message.senderId,
          senderName: message.senderName,
          messages: []
        };
      }
      acc[key].messages.push(message);
      return acc;
    }, {});
    
    // Trier les groupes par la date du message le plus récent
    const result = Object.values(grouped).sort((a, b) => {
      const latestA = Math.max(...a.messages.map(m => m.timestamp.getTime()));
      const latestB = Math.max(...b.messages.map(m => m.timestamp.getTime()));
      return latestB - latestA;
    });
    
    console.log('Grouped messages:', result);
    return result;
  };

  const handleMessageAction = async (message, action) => {
    try {
      const messageRef = doc(db, 'messages', message.id);
      if (action === 'approve') {
        await updateDoc(messageRef, {
          status: 'approved',
          approvedAt: Timestamp.now()
        });
      } else if (action === 'reject') {
        await updateDoc(messageRef, {
          status: 'rejected',
          rejectedAt: Timestamp.now()
        });
      }
      
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== message.id));
    } catch (err) {
      console.error('Erreur lors de l\'action:', err);
      alert('Erreur lors de l\'action sur le message');
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
            groupMessagesBySender(messages).map((group) => (
              <div key={group.senderId} className="sender-group">
                <div 
                  className={`sender-group-header ${selectedSenderId === group.senderId ? 'selected' : ''}`}
                  onClick={() => handleSelectSender(group.senderId)}
                >
                  <span className="sender-name">{group.senderName}</span>
                  <span className="message-count">
                    {group.messages.length} message{group.messages.length > 1 ? 's' : ''}
                  </span>
                </div>
                {selectedSenderId === group.senderId && (
                  <div className="message-list">
                    {group.messages.map((message) => (
                      <div key={message.id} className="message-bubble">
                        <div className="message-info">
                          <span>À: {message.receiverName}</span>
                          <span>
                            {message.timestamp.toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="message-text">
                          {message.content}
                        </div>
                        <div className="message-actions">
                          <button
                            className="action-button approve-button"
                            onClick={() => handleMessageAction(message, 'approve')}
                          >
                            <FaCheck />
                            Approuver
                          </button>
                          <button
                            className="action-button reject-button"
                            onClick={() => handleMessageAction(message, 'reject')}
                          >
                            <FaTimes />
                            Rejeter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesContent;
