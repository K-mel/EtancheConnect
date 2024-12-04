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
import { FaTrash, FaTrashRestore } from 'react-icons/fa';
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
  NOTIFICATION: "Le message a été approuvé mais la notification n'a pas pu être envoyée",
  RESTORE: "Erreur lors de la restauration de la conversation"
};

const Messages = ({ showDeleted }) => {
  // États
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [deletedConversations, setDeletedConversations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [showDeletedMessages, setShowDeletedMessages] = useState(showDeleted);
  const [pendingMessages, setPendingMessages] = useState([]);

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
      
      if (otherUser) {
        const groupKey = `${otherUserId}_${demandeOrDevisNumber}`;
        
        if (!groups[groupKey]) {
          groups[groupKey] = {
            professional: {
              id: otherUserId,
              displayName: otherUser.displayName || otherUser.email,
              role: otherUser.role,
              companyName: otherUser.companyName
            },
            messages: [],
            demandeOrDevisNumber: demandeOrDevisNumber,
            lastMessage: null,
            unreadCount: 0,
            isDeleted: deletedConversations.includes(conversationKey)
          };
        }
        
        groups[groupKey].messages.push(message);
        
        // Mettre à jour le dernier message
        if (!groups[groupKey].lastMessage || 
            getMessageDate(message) > getMessageDate(groups[groupKey].lastMessage)) {
          groups[groupKey].lastMessage = message;
        }
        
        // Compter les messages non lus
        if (!message.read && message.receiverId === currentUser.uid) {
          groups[groupKey].unreadCount++;
        }
      }
    });

    // Trier les groupes par date du dernier message
    return Object.fromEntries(
      Object.entries(groups).sort(([,a], [,b]) => {
        const dateA = getMessageDate(a.lastMessage);
        const dateB = getMessageDate(b.lastMessage);
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

  // Effet pour initialiser showDeletedMessages avec la prop
  useEffect(() => {
    setShowDeletedMessages(showDeleted);
  }, [showDeleted]);

  // Effet pour charger les messages et les utilisateurs
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Charger le rôle de l'utilisateur
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }

        // Charger les conversations supprimées
        const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
        const deletedMessagesDoc = await getDoc(deletedMessagesRef);
        if (deletedMessagesDoc.exists()) {
          setDeletedConversations(deletedMessagesDoc.data().deletedConversations || []);
        } else {
          await setDoc(deletedMessagesRef, {
            deletedConversations: [],
            updatedAt: serverTimestamp()
          });
          setDeletedConversations([]);
        }

        // Charger les messages
        await fetchMessages();
        
      } catch (error) {
        console.error('Erreur lors du chargement initial:', error);
        setMessageError(ERROR_MESSAGES.INIT);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadInitialData();
    }
  }, [currentUser, showDeletedMessages]);

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
  const fetchMessages = async () => {
    try {
      setLoading(true);
      // Récupérer les messages où l'utilisateur est impliqué
      const messagesQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', currentUser.uid)
      );

      const [messagesSnapshot, usersSnapshot] = await Promise.all([
        getDocs(messagesQuery),
        getDocs(collection(db, 'users'))
      ]);

      // Créer un map des utilisateurs
      const usersMap = {};
      usersSnapshot.forEach(doc => {
        usersMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      setUsers(usersMap);

      // Traiter les messages et les trier par date
      const messagesData = messagesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA; // Tri décroissant (plus récent en premier)
        });

      setMessages(messagesData);
      setMessageError('');
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      setMessageError(ERROR_MESSAGES.LOAD);
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

  // Gestion de la restauration des messages
  const handleRestoreConversation = async (proId, devisNumber) => {
    try {
      const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
      const deletedMessagesDoc = await getDoc(deletedMessagesRef);
      
      if (!deletedMessagesDoc.exists()) {
        console.error('Document deletedMessages non trouvé');
        return;
      }

      const conversationKey = `${proId}_${devisNumber}`;
      const existingDeleted = deletedMessagesDoc.data().deletedConversations || [];
      const newDeletedConversations = existingDeleted.filter(key => key !== conversationKey);

      await updateDoc(deletedMessagesRef, {
        deletedConversations: newDeletedConversations,
        updatedAt: serverTimestamp()
      });

      // Mettre à jour l'état local
      setDeletedConversations(newDeletedConversations);
      
      // Recharger les messages
      await fetchMessages();

      // Log de l'activité
      await logActivity(
        ActivityTypes.MESSAGE,
        'Conversation restaurée',
        `Conversation restaurée avec succès`,
        currentUser.uid
      );

      setMessageError('');
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      setMessageError(ERROR_MESSAGES.RESTORE);
      setTimeout(() => setMessageError(''), 3000);
    }
  };

  // Gestion des actions UI
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
        newDeletedConversations = [...existingDeleted, conversationKey];
      } else {
        newDeletedConversations = [conversationKey];
        await setDoc(deletedMessagesRef, {
          deletedConversations: newDeletedConversations,
          updatedAt: serverTimestamp()
        });
      }

      await updateDoc(deletedMessagesRef, {
        deletedConversations: newDeletedConversations,
        updatedAt: serverTimestamp()
      });

      setDeletedConversations(newDeletedConversations);
      setSelectedMessage(null);

      // Log de l'activité
      await logActivity(
        ActivityTypes.MESSAGE,
        'Conversation supprimée',
        `Conversation masquée de la liste`,
        currentUser.uid
      );

      setMessageError('');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setMessageError(ERROR_MESSAGES.DELETE);
      setTimeout(() => setMessageError(''), 3000);
    }
  };

  const isConversationDeleted = (proId, devisNumber) => {
    const conversationKey = `${proId}_${devisNumber}`;
    return deletedConversations.includes(conversationKey);
  };

  const filterDeletedConversations = (messages) => {
    if (!messages) return [];
    return messages.filter(message => {
      const otherUserId = message.senderId === currentUser.uid ? message.receiverId : message.senderId;
      const devisNumber = generateDemandeNumber(message);
      return !isConversationDeleted(otherUserId, devisNumber);
    });
  };

  // Fonctions de filtrage
  const filterMessages = (messages) => {
    if (!messages || !userRole) return [];
    
    return messages.filter(msg => {
      const otherUserId = msg.senderId === currentUser.uid ? msg.receiverId : msg.senderId;
      const devisNumber = generateDemandeNumber(msg);
      const conversationKey = `${otherUserId}_${devisNumber}`;
      const isDeleted = deletedConversations.includes(conversationKey);

      // Si on veut voir les messages supprimés
      if (showDeletedMessages) {
        return isDeleted;
      }
      
      // Si on ne veut pas voir les messages supprimés
      return !isDeleted && (
        userRole === 'administrateur' || 
        msg.senderId === currentUser?.uid || 
        msg.status === 'approved'
      );
    });
  };

  // Fonction pour filtrer les conversations en fonction de leur état de suppression
  const filterConversations = (groups) => {
    if (!groups) return {};
    
    return Object.fromEntries(
      Object.entries(groups).filter(([groupKey, group]) => {
        const isDeleted = deletedConversations.includes(
          `${group.professional.id}_${group.demandeOrDevisNumber}`
        );
        // Si showDeletedMessages est true, on ne montre que les conversations supprimées
        // Sinon, on ne montre que les conversations non supprimées
        return showDeletedMessages ? isDeleted : !isDeleted;
      })
    );
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

  const RestoreButton = ({ conversation }) => {
    const isDeleted = deletedConversations.includes(
      `${conversation.professional.id}_${conversation.demandeOrDevisNumber}`
    );

    if (!isDeleted) return null;

    return (
      <button
        className="restore-conversation-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('Voulez-vous restaurer cette conversation ?')) {
            handleRestoreConversation(conversation.professional.id, conversation.demandeOrDevisNumber);
          }
        }}
      >
        <FaTrashRestore /> Restaurer
      </button>
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

  // Fonction pour filtrer les messages en fonction de showDeletedMessages
  const toggleDeletedMessages = () => {
    setShowDeletedMessages(prev => !prev);
  };

  // Rendu principal
  if (!currentUser) return null;
  if (loading) return <div className="loading">Chargement des messages...</div>;

  const professionalGroups = messages && Array.isArray(messages) 
    ? groupMessagesByProfessional(messages) 
    : {};

  // Filtrer les conversations en fonction de showDeletedMessages
  const filteredGroups = filterConversations(professionalGroups);

  return (
    <div className="messages-container">
      <div className="professionals-list">
        <div className="professionals-header">
          <h2>Messages</h2>
          <button 
            className={`toggle-deleted-btn ${showDeletedMessages ? 'active' : ''}`}
            onClick={toggleDeletedMessages}
          >
            {showDeletedMessages ? 'Masquer messages supprimés' : 'Voir messages supprimés'}
          </button>
        </div>
        <div className="professionals-content">
          {Object.entries(filteredGroups).length === 0 ? (
            <div className="no-conversations">
              <p>{showDeletedMessages ? 'Aucun message supprimé' : 'Aucune conversation'}</p>
            </div>
          ) : (
            Object.entries(filteredGroups).map(([groupKey, group]) => {
              const isDeleted = deletedConversations.includes(
                `${group.professional.id}_${group.demandeOrDevisNumber}`
              );

              return (
                <div
                  key={groupKey}
                  className={`professional-item ${isDeleted ? 'deleted' : ''}`}
                  onClick={() => !isDeleted && setSelectedMessage(group.lastMessage)}
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
                      {group.lastMessage?.content?.substring(0, 50)}
                      {group.lastMessage?.content?.length > 50 ? '...' : ''}
                    </p>
                    <p className="message-time">
                      {formatTimestamp(group.lastMessage?.timestamp)}
                    </p>
                  </div>
                  <div className="professional-actions">
                    {isDeleted ? (
                      <button
                        className="restore-conversation-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Voulez-vous restaurer cette conversation ?')) {
                            handleRestoreConversation(
                              group.professional.id,
                              group.demandeOrDevisNumber
                            );
                          }
                        }}
                      >
                        <FaTrashRestore /> Restaurer
                      </button>
                    ) : (
                      <button
                        className="delete-conversation-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(
                            group.professional.id,
                            group.demandeOrDevisNumber,
                            e
                          );
                        }}
                      >
                        <FaTrash />
                      </button>
                    )}
                    {group.unreadCount > 0 && !isDeleted && (
                      <div className="unread-badge">{group.unreadCount}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {selectedMessage ? (
        <div className="conversation-view">
          <div className="conversation-header">
            <h2>
              {users[selectedMessage.senderId === currentUser.uid 
                ? selectedMessage.receiverId 
                : selectedMessage.senderId]?.displayName || 'Conversation'}
            </h2>
            {selectedMessage.devisNumber && (
              <p className="devis-number">
                {selectedMessage.devisNumber.startsWith('DEM-') ? (
                  `Demande N° ${selectedMessage.devisNumber.substring(4)}`
                ) : (
                  `Devis N° ${selectedMessage.devisNumber.substring(4)}`
                )}
              </p>
            )}
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
                .sort((a, b) => getMessageDate(b) - getMessageDate(a))
                .map(message => (
                  <div 
                    key={message.id}
                    className={`message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      <p>{message.content}</p>
                      {message.files && message.files.length > 0 && (
                        <div className="message-images">
                          {message.files.map((file, index) => (
                            <img
                              key={index}
                              src={file.url}
                              alt="Image jointe"
                              onClick={() => {
                                setSelectedImageUrl(file.url);
                                setIsModalOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="message-meta">
                        <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                        <MessageStatus status={message.status} />
                      </div>
                    </div>
                  </div>
                ));
            })()}
          </div>
          <div className="message-input">
            <form onSubmit={handleSendMessage}>
              <div className="message-input-container">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  disabled={isSending}
                />
                <button type="submit" disabled={isSending || !newMessage.trim()}>
                  {isSending ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
              {messageError && <div className="error-message">{messageError}</div>}
            </form>
          </div>
        </div>
      ) : (
        <div className="no-conversation-selected">
          <div className="empty-state">
            <FaEnvelope size={48} />
            <p>Sélectionnez une conversation pour afficher les messages</p>
          </div>
        </div>
      )}

      {isModalOpen && selectedImageUrl && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
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