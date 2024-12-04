// Imports React et Router
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Imports Firebase
import { 
  collection, query, where, getDocs, orderBy, doc, getDoc, 
  setDoc, addDoc, updateDoc, deleteDoc, writeBatch, 
  serverTimestamp, arrayUnion 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

// Imports des contextes et utilitaires
import { useAuth } from '../../contexts/AuthContext';
import { validateMessageContent, sanitizeMessageContent } from '../../utils/messageValidation';
import { createMessageNotification, createPendingMessageNotification } from '../../services/notificationService';
import { logActivity, ActivityTypes } from '../../utils/activityUtils';
import { formatDevisNumber } from '../../utils/formatters';

// Imports des composants et styles
import { FaEnvelope } from 'react-icons/fa';
import './Messages.css';

// Constantes pour les messages d'erreur
const ERROR_MESSAGES = {
  INIT: "Erreur lors de l'initialisation des messages",
  LOAD: "Erreur lors du chargement des messages",
  DELETE: "Erreur lors de la suppression de la conversation",
  UPLOAD: "Erreur lors de l'upload des images",
  SEND: "Erreur lors de l'envoi du message",
  APPROVE: "Erreur lors de l'approbation du message",
  REJECT: "Erreur lors du rejet du message",
  NOT_FOUND: "Message non trouvé",
  INVALID_IDS: "Message invalide - Informations manquantes",
  NOTIFICATION: "Le message a été approuvé mais la notification n'a pas pu être envoyée"
};

const Messages = () => {
  // États
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageError, setMessageError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletedConversations, setDeletedConversations] = useState([]);

  // Fonctions utilitaires
  const getMessageDate = (message) => {
    if (!message?.timestamp) return new Date(0);
    return message.timestamp.toDate?.() || new Date(message.timestamp);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleString();
  };

  const generateDemandeNumber = (message) => {
    if (!message) return 'Sans numéro';
  
    if (message.devisId) {
      return formatDevisNumber(message.devisId);
    }
    return 'Sans numéro';
  };

  const groupMessagesByProfessional = (messages) => {
    const groups = {};
    
    if (!messages || !users) {
      return groups;
    }
    
    messages.forEach(message => {
      const demandeOrDevisNumber = generateDemandeNumber(message);
      const otherUserId = message.senderId === currentUser.uid ? message.receiverId : message.senderId;
      const otherUser = users[otherUserId];
      
      const conversationKey = `${otherUserId}_${demandeOrDevisNumber}`;
      if (otherUser && !deletedConversations.includes(conversationKey)) {
        const groupKey = `${otherUserId}_${demandeOrDevisNumber}`;
        
        if (!groups[groupKey]) {
          groups[groupKey] = {
            professional: {
              ...otherUser,
              id: otherUserId,
              displayName: otherUser.displayName || otherUser.email || 'Utilisateur inconnu',
              role: otherUser.role || 'particulier'
            },
            messages: [],
            demandeOrDevisNumber,
            unreadCount: 0
          };
        }
        
        groups[groupKey].messages.push(message);
        
        if (!groups[groupKey].lastMessage || 
            getMessageDate(message) > getMessageDate(groups[groupKey].lastMessage)) {
          groups[groupKey].lastMessage = message;
        }
        
        if (!message.read && message.receiverId === currentUser.uid) {
          groups[groupKey].unreadCount++;
        }
      }
    });
  
    return Object.fromEntries(
      Object.entries(groups)
        .filter(([key, group]) => group.messages.length > 0)
        .sort(([keyA, groupA], [keyB, groupB]) => {
          const dateA = getMessageDate(groupA.lastMessage);
          const dateB = getMessageDate(groupB.lastMessage);
          return dateB - dateA;
        })
    );
  };

  const sortMessages = (a, b) => {
    const dateA = getMessageDate(a);
    const dateB = getMessageDate(b);
    return dateB - dateA;
  };

  // Gestionnaire d'erreurs
  const handleError = (error, errorType, duration = 5000) => {
    const errorMessage = ERROR_MESSAGES[errorType] || "Une erreur est survenue";
    setMessageError(errorMessage);
    setTimeout(() => setMessageError(''), duration);
    return null;
  };

  // Effets
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const initializeMessages = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setUserRole(role);
          await fetchMessages(role);
          if (role === 'administrateur') {
            await fetchPendingMessages();
          }
        }
      } catch (error) {
        handleError(error, 'INIT');
      }
    };

    initializeMessages();
  }, [currentUser, navigate]);

  useEffect(() => {
    const loadDeletedMessages = async () => {
      if (!currentUser) return;
      
      try {
        const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
        const deletedMessagesDoc = await getDoc(deletedMessagesRef);
        if (deletedMessagesDoc.exists()) {
          setDeletedConversations(deletedMessagesDoc.data().deletedConversations || []);
        }
      } catch (error) {
        handleError(error, 'LOAD');
      }
    };

    loadDeletedMessages();
  }, [currentUser]);

  useEffect(() => {
    if (selectedMessage) {
      markMessageAsRead(selectedMessage.id);
    }
  }, [selectedMessage]);

  // Fonctions de chargement des données
  const fetchMessages = async (userRole) => {
    if (!currentUser) return;
  
    try {
      setLoading(true);
      setMessageError('');
  
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = {};
      usersSnapshot.forEach((doc) => {
        usersData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setUsers(usersData);
  
      const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
      const deletedMessagesDoc = await getDoc(deletedMessagesRef);
      const deletedConversations = deletedMessagesDoc.exists() 
        ? deletedMessagesDoc.data().deletedConversations || []
        : [];
      setDeletedConversations(deletedConversations);
  
      const messagesRef = collection(db, 'messages');
      const q = userRole === 'administrateur'
        ? query(messagesRef)
        : query(messagesRef, where('participants', 'array-contains', currentUser.uid));
  
      const querySnapshot = await getDocs(q);
      const newMessages = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(message => {
          const otherUserId = message.senderId === currentUser.uid ? message.receiverId : message.senderId;
          const devisNumber = generateDemandeNumber(message);
          const conversationKey = `${otherUserId}_${devisNumber}`;
          return !deletedConversations.includes(conversationKey);
        });
  
      setMessages(newMessages);
  
    } catch (error) {
      console.error('Error fetching messages:', error);
      handleError(error, 'LOAD');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingMessages = async () => {
    if (userRole !== 'administrateur') return;

    try {
      const pendingQuery = query(
        collection(db, 'messages'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(pendingQuery);
      setPendingMessages(querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      handleError(error, 'LOAD');
    }
  };

  // Gestion des fichiers
  const handleFileSelect = (event) => {
    if (!currentUser) return;

    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
      return isValid && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setMessageError("Seules les images de moins de 5MB sont acceptées.");
      setTimeout(() => setMessageError(''), 3000);
    }

    setSelectedFiles(validFiles);
  };

  const uploadImages = async (files) => {
    if (!files.length) return [];
    
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const fileName = `message_images/${Date.now()}_${file.name}`;
          const imageRef = ref(storage, fileName);
          await uploadBytes(imageRef, file);
          return getDownloadURL(imageRef);
        })
      );
      return uploadedUrls;
    } catch (error) {
      handleError(error, 'UPLOAD');
      throw error;
    }
  };

  // Gestion des messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedMessage || !newMessage.trim()) return;
  
    try {
      setIsSending(true);
      setMessageError('');
  
      const receiverId = selectedMessage.senderId === currentUser.uid
        ? selectedMessage.receiverId
        : selectedMessage.senderId;
  
      const messageData = {
        content: newMessage.trim(),
        senderId: currentUser.uid,
        receiverId,
        timestamp: serverTimestamp(),
        status: 'pending',
        read: false,
        participants: [currentUser.uid, receiverId],
        files: [],
        type: users[currentUser.uid]?.role === 'professionnel' ? 'devis' : 'demande_devis',
        devisId: selectedMessage.devisId || generateDemandeNumber({ 
          type: users[currentUser.uid]?.role === 'professionnel' ? 'devis' : 'demande_devis', 
          timestamp: { seconds: Date.now() / 1000 } 
        })
      };
  
      if (selectedFiles.length) {
        const uploadedFiles = await uploadImages(selectedFiles);
        messageData.files = uploadedFiles;
      }
  
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      await logActivity(
        ActivityTypes.MESSAGE,
        'Nouveau message envoyé',
        `Message envoyé à ${users[receiverId]?.displayName || 'un utilisateur'}`,
        currentUser.uid
      );
      await createPendingMessageNotification(currentUser.uid, { 
        ...messageData, 
        id: docRef.id 
      });
  
      setNewMessage('');
      setSelectedFiles([]);
      
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        await fetchMessages(userDoc.data().role);
      }
    } catch (error) {
      handleError(error, 'SEND');
    } finally {
      setIsSending(false);
    }
  };

  const approveMessage = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnapshot = await getDoc(messageRef);
      
      if (!messageSnapshot.exists()) {
        return handleError(null, 'NOT_FOUND');
      }

      const messageData = messageSnapshot.data();
      if (!messageData.receiverId || !messageData.senderId) {
        return handleError(null, 'INVALID_IDS');
      }

      await updateDoc(messageRef, {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      await logActivity(
        ActivityTypes.MESSAGE,
        'Message approuvé',
        `Message de ${users[messageData.senderId]?.displayName || 'utilisateur'} approuvé`,
        currentUser.uid
      );

      try {
        await createMessageNotification(
          messageData.receiverId,
          messageData.senderId,
          { ...messageData, id: messageId },
          true
        );
      } catch (notifError) {
        handleError(notifError, 'NOTIFICATION');
      }

      if (userRole === 'administrateur') {
        await Promise.all([
          fetchMessages(userRole),
          fetchPendingMessages()
        ]);
      }

      setMessageError('Message approuvé avec succès');
      setTimeout(() => setMessageError(''), 3000);
    } catch (error) {
      handleError(error, 'APPROVE');
    }
  };

  const rejectMessage = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnapshot = await getDoc(messageRef);
      
      if (!messageSnapshot.exists()) {
        return handleError(null, 'NOT_FOUND');
      }
  
      const messageData = messageSnapshot.data();
      if (!messageData.receiverId || !messageData.senderId) {
        return handleError(null, 'INVALID_IDS');
      }
  
      await updateDoc(messageRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });
  
      await logActivity(
        ActivityTypes.MESSAGE,
        'Message rejeté',
        `Message de ${users[messageData.senderId]?.displayName || 'utilisateur'} rejeté`,
        currentUser.uid
      );
  
      if (userRole === 'administrateur') {
        await Promise.all([
          fetchMessages(userRole),
          fetchPendingMessages()
        ]);
      }
    } catch (error) {
      handleError(error, 'REJECT');
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        if (messageData.receiverId === currentUser.uid && !messageData.read) {
          await updateDoc(messageRef, {
            read: true,
            readAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      // Silently handle read status errors
    }
  };

  // Fonctions de filtrage
  const filterMessages = (messages) => {
    if (!messages || !userRole) return [];
    
    return messages.filter(msg => {
      if (userRole === 'administrateur') return true;
      if (msg.senderId === currentUser?.uid) return true;
      return msg.status === 'approved';
    });
  };

  // Gestion des actions UI
  const closeModal = () => {
    setSelectedImageUrl(null);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (proId, devisNumber, e) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer cette conversation ? Elle sera masquée de votre liste mais restera accessible à l\'autre utilisateur.')) {
      handleDeleteConversation(proId, devisNumber);
    }
  };

  const handleDeleteConversation = async (proId, devisNumber) => {
    try {
      const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
      const deletedMessagesDoc = await getDoc(deletedMessagesRef);
      
      const conversationKey = `${proId}_${devisNumber}`;
      let newDeletedConversations = [];
      
      if (deletedMessagesDoc.exists()) {
        const existingDeleted = deletedMessagesDoc.data().deletedConversations || [];
        if (!existingDeleted.includes(conversationKey)) {
          newDeletedConversations = [...existingDeleted, conversationKey];
          await updateDoc(deletedMessagesRef, {
            deletedConversations: newDeletedConversations,
            updatedAt: serverTimestamp()
          });
        }
      } else {
        newDeletedConversations = [conversationKey];
        await setDoc(deletedMessagesRef, {
          deletedConversations: newDeletedConversations,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
  
      setDeletedConversations(newDeletedConversations);
      
      setMessages(prevMessages => 
        prevMessages.filter(msg => {
          const msgDevisNumber = generateDemandeNumber(msg);
          return !(msg.senderId === proId && msgDevisNumber === devisNumber);
        })
      );
  
      await logActivity(
        ActivityTypes.MESSAGE,
        'Conversation supprimée',
        `Conversation avec ${users[proId]?.displayName || 'un utilisateur'} (Devis ${devisNumber}) supprimée`,
        currentUser.uid
      );
  
      if (selectedMessage) {
        const selectedDevisNumber = generateDemandeNumber(selectedMessage);
        if (selectedMessage.senderId === proId && selectedDevisNumber === devisNumber) {
          setSelectedMessage(null);
        }
      }
    } catch (error) {
      handleError(error, 'DELETE');
    }
  };

  // Composants de rendu
  const MessageStatus = ({ status }) => {
    const statusConfig = {
      approved: { class: 'approved', icon: '✓', text: 'Approuvé' },
      pending: { class: 'pending', icon: '⌛', text: 'En attente' },
      rejected: { class: 'rejected', icon: '✕', text: 'Rejeté' },
      en_attente_validation: { class: 'pending', icon: '⌛', text: 'En attente' }
    };

    const config = statusConfig[status] || { class: '', icon: '?', text: '' };

    return (
      <span className={`status-badge ${config.class}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.senderId === currentUser?.uid;
    const messageClass = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
    const otherUserId = isOwnMessage ? message.receiverId : message.senderId;
    const otherUser = users[otherUserId];
    const messageDevisNumber = generateDemandeNumber(message);

    return (
      <div key={message.id} className={messageClass}>
        <div className="message-content">
          {messageDevisNumber !== 'Sans numéro' && (
            <div className="message-reference">
              {messageDevisNumber.startsWith('DEM-') ? (
                `Demande N° ${messageDevisNumber.substring(4)}`
              ) : (
                `Devis N° ${messageDevisNumber.substring(4)}`
              )}
            </div>
          )}
          {message.status === 'rejected' && (
            <div className="message-rejected">
              <div className="rejection-header">Message rejeté</div>
              <div className="rejection-reason">
                {message.rejectionReason || 'Aucune raison spécifiée'}
              </div>
            </div>
          )}
          {message.content}
          <MessageStatus status={message.status} />
          {userRole === 'administrateur' && message.status === 'pending' && (
            <div className="admin-actions">
              <button 
                className="approve-message-btn"
                onClick={() => approveMessage(message.id)}
              >
                Valider
              </button>
              <button 
                className="reject-message-btn"
                onClick={() => rejectMessage(message.id)}
              >
                Rejeter
              </button>
            </div>
          )}
        </div>
        {message.files?.length > 0 && (
          <div className="message-files">
            {message.files.map((fileUrl, index) => (
              <img 
                key={index} 
                src={fileUrl} 
                alt="Image partagée"
                className="message-image"
                onClick={() => setSelectedImageUrl(fileUrl)}
                onError={(e) => e.target.style.display = 'none'}
              />
            ))}
          </div>
        )}
        <div className="message-info">
          <div className="message-user">
            {isOwnMessage ? 'Vous' : otherUser?.displayName || 'Utilisateur inconnu'}
          </div>
          <div className="message-timestamp">
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    );
  };

  // Rendu principal
  if (!currentUser) return null;
  if (loading) return <div className="loading">Chargement des messages...</div>;

  const professionalGroups = messages && Array.isArray(messages) 
    ? groupMessagesByProfessional(messages) 
    : {};

  return (
    <div className="messages-container">
      {/* Colonne de gauche - Liste des professionnels */}
      <div className="professionals-list">
        <div className="professionals-header">
          <h2>Conversations</h2>
        </div>
        <div className="professionals-content">
          {Object.entries(professionalGroups).length === 0 ? (
            <div className="no-conversations">
              <p>Aucune conversation</p>
            </div>
          ) : (
            Object.entries(professionalGroups).map(([groupKey, group]) => {
              const visibleMessages = filterMessages(group.messages);
              if (visibleMessages.length === 0) return null;

              const lastVisibleMessage = visibleMessages[0];
              const isSelected = selectedMessage && 
                (selectedMessage.devisNumber === group.demandeOrDevisNumber || 
                selectedMessage.devisId === group.demandeOrDevisNumber?.substring(4)) &&
                (selectedMessage.senderId === group.professional.id || 
                selectedMessage.receiverId === group.professional.id);

              return (
                <div
                  key={groupKey}
                  className={`professional-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedMessage(lastVisibleMessage)}
                >
                  <div className="professional-info">
                    <h3>{group.professional.displayName || group.professional.companyName}</h3>
                    {group.demandeOrDevisNumber !== 'Sans numéro' && (
                      <p className="devis-number">
                        {group.demandeOrDevisNumber.startsWith('DEM-') ? (
                          `Demande N° ${group.demandeOrDevisNumber.substring(4)}`
                        ) : (
                          `Devis N° ${group.demandeOrDevisNumber.substring(4)}`
                        )}
                      </p>
                    )}
                    <p className="last-message">
                      {lastVisibleMessage?.content?.substring(0, 50)}
                      {lastVisibleMessage?.content?.length > 50 ? '...' : ''}
                      {lastVisibleMessage?.files?.length > 0 && (
                        <span className="image-indicator"> 📷 {lastVisibleMessage.files.length} fichier(s)</span>
                      )}
                    </p>
                    <p className="message-time">{formatTimestamp(lastVisibleMessage?.timestamp)}</p>
                  </div>
                  <div className="professional-actions">
                    <div className="actions-column">
                      <button 
                        className="delete-conversation-btn"
                        onClick={(e) => handleDeleteClick(group.professional.id, group.demandeOrDevisNumber, e)}
                      >
                        Supprimer
                      </button>
                      {group.unreadCount > 0 && (
                        <div className="unread-badge">{group.unreadCount}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Colonne de droite - Conversation sélectionnée */}
      <div className="conversation-view">
        {selectedMessage ? (
          <>
            <div className="conversation-header">
              <h2>
                {users[selectedMessage.senderId === currentUser.uid 
                  ? selectedMessage.receiverId 
                  : selectedMessage.senderId]?.displayName || 'Conversation'}
              </h2>
            </div>
            <div className="messages-list">
              {(() => {
                if (!selectedMessage) return null;
                
                const otherUserId = selectedMessage.senderId === currentUser.uid 
                  ? selectedMessage.receiverId 
                  : selectedMessage.senderId;
                const demandeOrDevisNumber = generateDemandeNumber(selectedMessage);
                const groupKey = `${otherUserId}_${demandeOrDevisNumber}`;
                const groupMessages = professionalGroups[groupKey]?.messages || [];
                
                return filterMessages(groupMessages)
                  .sort(sortMessages)
                  .map(renderMessage);
              })()}
            </div>
            <div className="message-input">
              <form onSubmit={handleSendMessage}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  disabled={isSending}
                />
                <div className="file-input-container">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="file-upload">
                    Ajouter des images
                  </label>
                  {selectedFiles.length > 0 && (
                    <div className="selected-files">
                      {selectedFiles.length} fichier(s) sélectionné(s)
                    </div>
                  )}
                </div>
                <button type="submit" disabled={isSending}>
                  {isSending ? 'Envoi...' : 'Envoyer'}
                </button>
              </form>
              {messageError && <div className="error-message">{messageError}</div>}
            </div>
          </>
        ) : (
          <div className="no-conversation-selected">
            <FaEnvelope size={48} />
            <p>Sélectionnez une conversation pour afficher les messages</p>
          </div>
        )}
      </div>
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
    </div>
  );
};

export default Messages;