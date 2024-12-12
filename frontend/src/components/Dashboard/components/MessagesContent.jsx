import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  getDoc, 
  where, 
  Timestamp, 
  limit, 
  startAfter 
} from 'firebase/firestore';
import { FaTrash, FaCheck, FaTimes, FaEye, FaHistory } from 'react-icons/fa';
import { db, auth } from '../../../firebase';
import { createMessageNotification } from '../../../services/notificationService';
import './MessagesContent.css';
import { useAuth } from '../../../contexts/AuthContext';

const MessagesContent = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [allHistoryMessages, setAllHistoryMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSenderId, setSelectedSenderId] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: '7days',
    type: 'all'
  });

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [messageToReject, setMessageToReject] = useState(null);
  const [rejectError, setRejectError] = useState('');

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
      if (!currentUser) {
        setError('Veuillez vous connecter pour accéder aux messages');
        setLoading(false);
        return;
      }
  
      setLoading(true);
      setError(null);
      
      // Vérifier si l'utilisateur est un administrateur
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const isAdmin = userDoc.exists() && userDoc.data().role === 'administrateur';
      
      const messagesRef = collection(db, 'messages');
      let messagesQuery;
      
      if (isAdmin) {
        // Pour l'administrateur, récupérer tous les messages en attente de validation
        messagesQuery = query(
          messagesRef,
          where('status', '==', 'en_attente_validation'),
          where('type', '==', 'question'),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Pour les autres utilisateurs, récupérer leurs messages en attente
        messagesQuery = query(
          messagesRef,
          where('recipientId', '==', currentUser.uid),
          where('status', 'in', ['pending', 'en_attente_validation']),
          orderBy('createdAt', 'desc')
        );
      }
      
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
          timestamp: formatTimestamp(messageData.createdAt)
        };
      });
  
      const loadedMessages = await Promise.all(messagesPromises);
      
      // Tri côté client
      const sortedMessages = loadedMessages.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA;
      });
  
      setMessages(sortedMessages);
      setLastDoc(messagesSnapshot.docs[messagesSnapshot.docs.length - 1] || null);
      setHasMore(messagesSnapshot.docs.length === 10);
  
    } catch (err) {
      console.error('Erreur lors de la récupération des messages:', err);
      setError('Une erreur est survenue lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryMessages = async (isInitial = false) => {
    try {
      setHistoryLoading(true);
      const messagesRef = collection(db, 'messages');
      
      let q = query(messagesRef, orderBy('createdAt', 'desc'));

      // Appliquer les filtres
      if (filters.status !== 'all') {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters.type !== 'all') {
        q = query(q, where('type', '==', filters.type));
      }

      // Filtre de date
      const now = new Date();
      let startDate;
      switch (filters.dateRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        q = query(q, where('createdAt', '>=', Timestamp.fromDate(startDate)));
      }

      // Pagination
      q = query(q, limit(20)); 
      if (!isInitial && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const messagesPromises = snapshot.docs.map(async (doc) => {
        const messageData = doc.data();
        const senderName = await getUserData(messageData.senderId);
        const receiverName = await getUserData(messageData.receiverId);
        
        return {
          id: doc.id,
          ...messageData,
          senderName,
          receiverName,
          createdAt: formatTimestamp(messageData.createdAt)
        };
      });

      const newMessages = await Promise.all(messagesPromises);

      if (isInitial) {
        setAllHistoryMessages(newMessages);
      } else {
        setAllHistoryMessages(prev => [...prev, ...newMessages]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 20); 
      
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'historique:', err);
      setError('Erreur lors du chargement de l\'historique des messages');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory && searchQuery.trim()) {
      const filteredMessages = allHistoryMessages.filter(msg => 
        msg.senderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.receiverName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setHistoryMessages(filteredMessages);
    } else if (showHistory) {
      setHistoryMessages(allHistoryMessages);
    }
  }, [searchQuery, allHistoryMessages, showHistory]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setLastDoc(null);
    fetchHistoryMessages(true);
  };

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
      console.log('=== Début de l\'action sur le message ===', {
        messageId: message.id,
        action: action
      });
  
      const messageRef = doc(db, 'messages', message.id);
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const timestamp = Timestamp.now();
      
      await updateDoc(messageRef, {
        status: newStatus,
        [action === 'approve' ? 'approvedAt' : 'rejectedAt']: timestamp
      });
  
      console.log('=== Message mis à jour avec succès ===');
  
      // Si le message est approuvé, créer une notification
      if (action === 'approve') {
        try {
          console.log('=== Tentative de création de notification ===', {
            receiverId: message.receiverId,
            senderId: message.senderId,
            messageData: message
          });
  
          const notificationId = await createMessageNotification(
            message.receiverId,
            message.senderId,
            { ...message, status: newStatus },
            true
          );
  
          console.log('=== Notification créée avec succès ===', {
            notificationId: notificationId
          });
        } catch (notifError) {
          console.error('=== Erreur lors de la création de la notification ===', notifError);
          console.error('Stack trace:', notifError.stack);
        }
      }
  
      // Retirer le message de la liste des messages en attente
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== message.id));
      
      // Si le message est approuvé, l'ajouter à l'historique
      if (action === 'approve') {
        const updatedMessage = {
          ...message,
          status: newStatus,
          approvedAt: timestamp,
          createdAt: timestamp
        };
        
        setHistoryMessages(prevHistory => [updatedMessage, ...prevHistory]);
      }
      
    } catch (err) {
      console.error('=== Erreur générale lors de l\'action sur le message ===', err);
      console.error('Stack trace:', err.stack);
      setError(`Une erreur est survenue lors de l'${action === 'approve' ? 'approbation' : 'rejet'} du message`);
    }
  };

  const handleImageClick = (url) => {
    setSelectedImageUrl(url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedImageUrl(null);
    setIsModalOpen(false);
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Attention : Cette action supprimera définitivement le message de la base de données. Cette action est irréversible. Voulez-vous continuer ?')) {
      try {
        // Supprimer le message de Firestore
        await deleteDoc(doc(db, 'messages', messageId));
        
        // Mettre à jour l'historique local
        setHistoryMessages(prevHistory => 
          prevHistory.filter(msg => msg.id !== messageId)
        );
        
      } catch (err) {
        console.error('Erreur lors de la suppression du message:', err);
        setError('Une erreur est survenue lors de la suppression du message');
      }
    }
  };

  const handleOpenRejectModal = (message) => {
    setMessageToReject(message);
    setRejectReason('');
    setRejectError('');
    setIsRejectModalOpen(true);
  };

  const handleCloseRejectModal = () => {
    setIsRejectModalOpen(false);
    setMessageToReject(null);
    setRejectReason('');
    setRejectError('');
  };

  const handleRejectMessage = async () => {
    if (!rejectReason.trim()) {
      setRejectError('Veuillez expliquer la raison du rejet');
      return;
    }

    try {
      const messageRef = doc(db, 'messages', messageToReject.id);
      await updateDoc(messageRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectionReason: rejectReason
      });

      // Créer une notification pour l'expéditeur
      await createMessageNotification(messageToReject.senderId, {
        type: 'MESSAGE_REJECTED',
        messageId: messageToReject.id,
        reason: rejectReason
      });

      // Rafraîchir les messages
      await fetchMessages();
      if (showHistory) {
        await fetchHistoryMessages(true);
      }

      handleCloseRejectModal();
    } catch (error) {
      console.error('Erreur lors du rejet du message:', error);
      setRejectError('Une erreur est survenue lors du rejet du message');
    }
  };

  const renderMessage = (message) => {
    const isDevisMessage = message.type === 'devis_question';
    
    return (
      <div key={message.id} className="message-item">
        <div className="message-header">
          <div className="message-info">
            <div className="message-participants">
              <span className="sender">De: <span className="sender-name">{message.senderName}</span></span>
              <span className="arrow">→</span>
              <span className="receiver">À: <span className="receiver-name">{message.receiverName}</span></span>
            </div>
            <span className="message-type-badge">
              {isDevisMessage ? 'Question Devis' : 'Message'}
            </span>
            {message.devisInfo && (
              <span className="devis-reference">
                Devis #{message.devisInfo.id.substring(0, 6)}
              </span>
            )}
          </div>
          <div className="message-timestamp">
            {formatTimestamp(message.timestamp).toLocaleString()}
          </div>
        </div>
        
        <div className="message-content">
          <p>{message.content}</p>
          {message.devisInfo && (
            <div className="devis-details">
              <p><strong>Détails du devis :</strong></p>
              <p>{message.devisInfo.description}</p>
            </div>
          )}
          {message.files && message.files.length > 0 && (
            <div className="message-files">
              {message.files.map((fileUrl, index) => (
                <img 
                  key={index} 
                  src={fileUrl} 
                  alt="Image partagée"
                  className="message-image"
                  onClick={() => handleImageClick(fileUrl)}
                  onError={(e) => {
                    console.error("Erreur de chargement de l'image:", fileUrl);
                    e.target.style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="message-actions">
          <button
            className="approve-button"
            onClick={() => handleMessageAction(message, 'approve')}
          >
            <FaCheck /> Approuver
          </button>
          <button
            className="reject-button"
            onClick={() => handleOpenRejectModal(message)}
          >
            <FaTimes /> Rejeter
          </button>
        </div>
      </div>
    );
  };

  const renderHistoryMessage = (message) => {
    const isDevisMessage = message.type === 'devis_question';
    
    return (
      <div key={message.id} className="message-item">
        <div className="message-header">
          <div className="message-info">
            <div className="message-participants">
              <span className="sender">De: <span className="sender-name">{message.senderName}</span></span>
              <span className="arrow">→</span>
              <span className="receiver">À: <span className="receiver-name">{message.receiverName}</span></span>
            </div>
            <div className="message-status-info">
              <span className={`status-badge ${message.status}`}>
                {message.status === 'approved' ? 'Approuvé' : 'Rejeté'}
              </span>
              <span className="message-type-badge">
                {isDevisMessage ? 'Question Devis' : 'Message'}
              </span>
              {message.devisInfo && (
                <span className="devis-reference">
                  Devis #{message.devisInfo.id.substring(0, 6)}
                </span>
              )}
            </div>
          </div>
          <div className="message-actions">
            <button 
              className="delete-message-btn"
              onClick={() => handleDeleteMessage(message.id)}
              title="Supprimer définitivement ce message"
            >
              <FaTrash /> Supprimer
            </button>
          </div>
        </div>
        
        <div className="message-content">
          <p>{message.content}</p>
          {message.devisInfo && (
            <div className="devis-details">
              <p><strong>Détails du devis :</strong></p>
              <p>{message.devisInfo.description}</p>
            </div>
          )}
          {message.files && message.files.length > 0 && (
            <div className="message-files">
              {message.files.map((fileUrl, index) => (
                <img 
                  key={index} 
                  src={fileUrl} 
                  alt="Image partagée"
                  className="message-image"
                  onClick={() => handleImageClick(fileUrl)}
                  onError={(e) => {
                    console.error("Erreur de chargement de l'image:", fileUrl);
                    e.target.style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="message-timestamp">
          {formatTimestamp(message.createdAt).toLocaleString()}
        </div>
      </div>
    );
  };

  const renderRejectModal = () => {
    if (!isRejectModalOpen) return null;

    return (
      <div className="modal-overlay" onClick={handleCloseRejectModal}>
        <div className="modal-content reject-modal" onClick={e => e.stopPropagation()}>
          <h3>Rejeter le message</h3>
          
          <div className="reject-info">
            <p>Veuillez expliquer la raison du rejet :</p>
          </div>

          <textarea 
            placeholder="Expliquez pourquoi ce message est rejeté..." 
            className="reject-textarea"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          ></textarea>

          {rejectError && (
            <div className="error-message">
              {rejectError}
            </div>
          )}

          <div className="modal-actions">
            <button 
              className="submit-btn" 
              onClick={handleRejectMessage}
              disabled={!rejectReason.trim()}
            >
              Confirmer le rejet
            </button>
            <button 
              className="cancel-btn"
              onClick={handleCloseRejectModal}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="messages-content">
      <div className="messages-header">
        <h2>Messages</h2>
        <button 
          className="history-button"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) {
              fetchHistoryMessages(true);
            }
          }}
        >
          <FaHistory /> Historique des messages
        </button>
      </div>

      {showHistory ? (
        <div className="history-container">
          <div className="history-header">
            <h2>Historique des Messages</h2>
            <button onClick={() => setShowHistory(false)} className="back-button">
              Retour aux messages
            </button>
          </div>
          <div className="filters-container">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </select>

            <select 
              value={filters.dateRange} 
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="24h">Dernières 24h</option>
              <option value="7days">7 derniers jours</option>
              <option value="30days">30 derniers jours</option>
              <option value="all">Tout</option>
            </select>

            <select 
              value={filters.type} 
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">Tous les types</option>
              <option value="question">Questions</option>
              <option value="devis">Devis</option>
              <option value="general">Général</option>
            </select>
          </div>

          <div className="messages-list history">
            {historyMessages.map((message, index) => (
              <div key={`history-${message.id}-${index}`}>
                {renderHistoryMessage(message)}
              </div>
            ))}
            {historyLoading && (
              <div className="loading">Chargement...</div>
            )}
            {hasMore && !historyLoading && (
              <button 
                className="load-more"
                onClick={() => fetchHistoryMessages(false)}
              >
                Charger plus
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="messages-container">
          {/* Colonne de gauche - Liste des expéditeurs */}
          <div className="senders-column">
            <div className="senders-header">
              <h2>Messages en attente de validation</h2>
            </div>
            <div className="senders-list">
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
                  <div 
                    key={group.senderId} 
                    className={`sender-item ${selectedSenderId === group.senderId ? 'selected' : ''}`}
                    onClick={() => handleSelectSender(group.senderId)}
                  >
                    <div className="sender-info">
                      <span className="sender-name">{group.senderName}</span>
                      <span className="message-count">
                        {group.messages.length} message{group.messages.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Colonne de droite - Messages du groupe sélectionné */}
          <div className="messages-column">
            {selectedSenderId ? (
              <div>
                <div className="messages-header">
                  <h2>
                    {groupMessagesBySender(messages).find(g => g.senderId === selectedSenderId)?.senderName}
                  </h2>
                </div>
                <div className="messages-view">
                  {groupMessagesBySender(messages)
                    .find(g => g.senderId === selectedSenderId)
                    ?.messages.map((message, index) => (
                      <div key={`message-${message.id}-${index}`}>
                        {renderMessage(message)}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="no-selection">
                <p>Sélectionnez un expéditeur pour voir ses messages</p>
              </div>
            )}
          </div>
        </div>
      )}
      {isModalOpen && selectedImageUrl && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            <img 
              src={selectedImageUrl} 
              alt="Image en grand"
              className="modal-image"
            />
          </div>
        </div>
      )}
      {renderRejectModal()}
    </div>
  );
};

export default MessagesContent;
