import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, query, where, getDocs, orderBy, doc, getDoc, 
  setDoc, addDoc, updateDoc, deleteDoc, writeBatch, 
  serverTimestamp, arrayUnion 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validateMessageContent, sanitizeMessageContent } from '../../utils/messageValidation';
import { FaEnvelope } from 'react-icons/fa';
import './Messages.css';
import { createMessageNotification, createPendingMessageNotification } from '../../services/notificationService';
import { logActivity, ActivityTypes } from '../../utils/activityUtils';

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
  
  // Utilitaires
  const getMessageDate = (message) => {
    if (!message?.timestamp) return new Date(0);
    return message.timestamp.toDate?.() || new Date(message.timestamp);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleString();
  };

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

  // Fonctions de gestion des messages
  const fetchMessages = async (userRole) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setMessageError('');

      // Récupération des utilisateurs
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = {};
      usersSnapshot.forEach((doc) => {
        usersData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setUsers(usersData);

      // Récupération des conversations supprimées
      const deletedMessagesDoc = await getDoc(doc(db, 'deletedMessages', currentUser.uid));
      const deletedConvs = deletedMessagesDoc.exists() 
        ? deletedMessagesDoc.data().deletedConversations || []
        : [];
      setDeletedConversations(deletedConvs);

      // Requête des messages
      const messagesRef = collection(db, 'messages');
      const q = userRole === 'administrateur'
        ? query(messagesRef)
        : query(messagesRef, where('participants', 'array-contains', currentUser.uid));

      const querySnapshot = await getDocs(q);
      const newMessages = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(msg => !deletedConvs.includes(
          msg.senderId === currentUser.uid ? msg.receiverId : msg.senderId
        ));

      setMessages(newMessages);
    } catch (error) {
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
          files: []
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
        
        // Rafraîchir les messages
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

    // Fonctions utilitaires de filtrage et de tri
    const filterMessages = (messages) => {
      if (!messages || !userRole) return [];
      
      return messages.filter(msg => {
        if (userRole === 'administrateur') return true;
        if (msg.senderId === currentUser?.uid) return true;
        return msg.status === 'approved';
      });
    };
  
    const groupMessagesByProfessional = (messages) => {
      const groups = {};
      
      if (!messages || !Array.isArray(messages)) {
        return {};
      }
      
      messages.forEach(message => {
        const otherUserId = message.senderId === currentUser.uid ? message.receiverId : message.senderId;
        const otherUser = users[otherUserId];
        
        if (otherUser) {
          if (!groups[otherUserId]) {
            groups[otherUserId] = {
              professional: otherUser,
              messages: [],
              lastMessage: null,
              unreadCount: 0
            };
          }
          
          if (filterMessages([message]).length > 0) {
            groups[otherUserId].messages.push(message);
            
            if (!message.read && message.senderId === otherUserId) {
              groups[otherUserId].unreadCount++;
            }
          }
        }
      });
  
      Object.values(groups).forEach(group => {
        if (group.messages.length > 0) {
          group.messages.sort(sortMessages);
          group.lastMessage = group.messages[0];
        }
      });
  
      return Object.fromEntries(
        Object.entries(groups).filter(([_, group]) => group.messages.length > 0)
      );
    };
  
    const sortMessages = (a, b) => {
      const dateA = getMessageDate(a);
      const dateB = getMessageDate(b);
      return dateB - dateA;  // Tri décroissant (plus récent en premier)
    };
  
    // Gestion des actions UI
    const closeModal = () => {
      setSelectedImageUrl(null);
      setIsModalOpen(false);
    };
  
    const handleDeleteClick = (proId, e) => {
      e.stopPropagation();
      if (window.confirm('Voulez-vous vraiment supprimer cette conversation ? Elle sera masquée de votre liste mais restera accessible à l\'autre utilisateur.')) {
        handleDeleteConversation(proId);
      }
    };
  
    const handleDeleteConversation = async (proId) => {
      try {
        const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
        const deletedMessagesDoc = await getDoc(deletedMessagesRef);
        
        let newDeletedConversations = [];
        
        if (deletedMessagesDoc.exists()) {
          const existingDeleted = deletedMessagesDoc.data().deletedConversations || [];
          if (!existingDeleted.includes(proId)) {
            newDeletedConversations = [...existingDeleted, proId];
            await updateDoc(deletedMessagesRef, {
              deletedConversations: newDeletedConversations,
              updatedAt: serverTimestamp()
            });
          }
        } else {
          newDeletedConversations = [proId];
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
            const autreUtilisateur = msg.senderId === currentUser.uid ? msg.receiverId : msg.senderId;
            return autreUtilisateur !== proId;
          })
        );

        await logActivity(
          ActivityTypes.MESSAGE,
          'Conversation supprimée',
          `Conversation avec ${users[proId]?.displayName || 'un utilisateur'} supprimée`,
          currentUser.uid
        );
  
        if (selectedMessage) {
          const autreUtilisateur = selectedMessage.senderId === currentUser.uid 
            ? selectedMessage.receiverId 
            : selectedMessage.senderId;
          if (autreUtilisateur === proId) {
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

    return (
      <div key={message.id} className={messageClass}>
        <div className="message-content">
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
          {Object.entries(professionalGroups).map(([proId, group]) => {
            // Filter messages based on visibility rules
            const visibleMessages = filterMessages(group.messages);
            if (visibleMessages.length === 0) return null;

            // Use the most recent visible message as the last message
            const lastVisibleMessage = visibleMessages[0];

            return (
              <div
                key={proId}
                className={`professional-item ${selectedMessage && (selectedMessage.senderId === proId || selectedMessage.receiverId === proId) ? 'selected' : ''}`}
                onClick={() => setSelectedMessage(lastVisibleMessage)}
              >
                <div className="professional-info">
                  <h3>{group.professional.displayName || group.professional.companyName}</h3>
                  <p className="last-message">
                    {lastVisibleMessage?.content?.substring(0, 50)}
                    {lastVisibleMessage?.content?.length > 50 ? '...' : ''}
                    {lastVisibleMessage?.files?.length > 0 && (
                      <span className="image-indicator"> 📷 {lastVisibleMessage.files.length} fichier(s)</span>
                    )}
                    {lastVisibleMessage?.status === 'pending' && (
                      <span className="pending-indicator"> (En attente de validation)</span>
                    )}
                    {lastVisibleMessage?.status === 'rejected' && (
                      <span className="rejected-indicator"> (Rejeté)</span>
                    )}
                  </p>
                  <span className="message-time">
                    {formatTimestamp(lastVisibleMessage?.timestamp)}
                  </span>
                </div>
                <div className="professional-actions">
                  <div className="actions-column">
                    <button 
                      className="delete-conversation-btn"
                      onClick={(e) => handleDeleteClick(proId, e)}
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
          })}
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
              {filterMessages(professionalGroups[selectedMessage.senderId === currentUser.uid 
                ? selectedMessage.receiverId 
                : selectedMessage.senderId]?.messages || []).
                sort(sortMessages).
                map(renderMessage)}
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
  />
  <label htmlFor="file-upload">
    Ajouter des images
  </label>
  {/* Optionnel : afficher les fichiers sélectionnés */}
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