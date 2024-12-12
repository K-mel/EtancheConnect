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
    
    // Première passe : grouper par numéro de demande
    const demandeGroups = {};
    messages.forEach(message => {
      const demandeNumber = generateDemandeNumber(message);
      if (!demandeGroups[demandeNumber]) {
        demandeGroups[demandeNumber] = [];
      }
      demandeGroups[demandeNumber].push(message);
    });

    // Deuxième passe : pour chaque demande, grouper par professionnel
    Object.entries(demandeGroups).forEach(([demandeNumber, demandeMessages]) => {
      demandeMessages.forEach(message => {
        const otherUserId = message.senderId === currentUser.uid ? message.receiverId : message.senderId;
        const otherUser = users[otherUserId];
        
        if (otherUser) {
          const groupKey = `${demandeNumber}_${otherUserId}`;
          
          if (!groups[groupKey]) {
            groups[groupKey] = {
              professional: {
                id: otherUserId,
                displayName: otherUser.displayName || otherUser.email,
                role: otherUser.role,
                companyName: otherUser.companyName
              },
              messages: [],
              demandeNumber: demandeNumber,
              lastMessage: null,
              unreadCount: 0,
              isDeleted: deletedConversations.includes(groupKey)
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
    });

    // Trier les groupes d'abord par numéro de demande, puis par date du dernier message
    return Object.fromEntries(
      Object.entries(groups).sort(([keyA, a], [keyB, b]) => {
        const [demandeA] = keyA.split('_');
        const [demandeB] = keyB.split('_');
        
        // Si même demande, trier par date du dernier message
        if (demandeA === demandeB) {
          const dateA = getMessageDate(a.lastMessage);
          const dateB = getMessageDate(b.lastMessage);
          return dateB - dateA;
        }
        
        // Sinon, trier par numéro de demande (plus récent en premier)
        return demandeB.localeCompare(demandeA);
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
      
      // Construire la requête en fonction du rôle de l'utilisateur
      let messagesQuery;
      if (userRole === 'professionnel') {
        // Pour un professionnel, on ne récupère que les messages où il est impliqué
        messagesQuery = query(
          collection(db, 'messages'),
          where('participants', 'array-contains', currentUser.uid)
        );
      } else if (userRole === 'administrateur') {
        // Pour un administrateur, on récupère tous les messages
        messagesQuery = query(collection(db, 'messages'));
      } else {
        // Pour un particulier, on récupère ses messages sauf ceux en attente de validation
        messagesQuery = query(
          collection(db, 'messages'),
          where('participants', 'array-contains', currentUser.uid),
          where('status', '!=', 'en_attente_validation')
        );
      }

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

      // Traiter les messages
      const messagesData = messagesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(message => {
          if (userRole === 'professionnel') {
            // Un professionnel ne voit que les messages où il est impliqué
            return message.participants.includes(currentUser.uid);
          } else if (userRole === 'administrateur') {
            // Un administrateur voit tous les messages
            return true;
          } else {
            // Un particulier voit ses messages sauf ceux en attente de validation
            return message.participants.includes(currentUser.uid) && 
                   (message.status !== 'en_attente_validation' || message.senderId === currentUser.uid);
          }
        })
        .sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
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
  const validateMessageContent = (content) => {
    // Regex pour détecter les numéros de téléphone (formats français)
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;
    
    // Regex pour détecter les emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    
    // Regex pour détecter les URLs
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/;
    
    // Vérification des patterns interdits
    if (phoneRegex.test(content)) {
      return {
        isValid: false,
        error: "Les numéros de téléphone ne sont pas autorisés dans les messages."
      };
    }
    
    if (emailRegex.test(content)) {
      return {
        isValid: false,
        error: "Les adresses email ne sont pas autorisées dans les messages."
      };
    }
    
    if (urlRegex.test(content)) {
      return {
        isValid: false,
        error: "Les URLs ne sont pas autorisées dans les messages."
      };
    }
    
    return {
      isValid: true,
      error: null
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedMessage || !newMessage.trim()) return;

    // Valider le contenu du message
    const validation = validateMessageContent(newMessage.trim());
    if (!validation.isValid) {
      setMessageError(validation.error);
      setTimeout(() => setMessageError(''), 3000);
      return;
    }

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

  const markMessagesAsRead = async (messages) => {
    try {
      const batch = writeBatch(db);
      messages.forEach(message => {
        if (!message.read && message.receiverId === currentUser.uid) {
          const messageRef = doc(db, 'messages', message.id);
          batch.update(messageRef, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error('Erreur lors du marquage des messages comme lus:', error);
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
          `${group.professional.id}_${group.demandeNumber}`
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
      `${conversation.professional.id}_${conversation.demandeNumber}`
    );

    if (!isDeleted) return null;

    return (
      <button
        className="restore-conversation-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('Voulez-vous restaurer cette conversation ?')) {
            handleRestoreConversation(conversation.professional.id, conversation.demandeNumber);
          }
        }}
      >
        <FaTrashRestore /> Restaurer
      </button>
    );
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.senderId === currentUser?.uid;
    const messageClass = `message ${isOwnMessage ? 'own-message' : ''} ${
      message.status === 'en_attente_validation' ? 'message-pending' : ''
    }`;
    const otherUserId = isOwnMessage ? message.receiverId : message.senderId;
    const otherUser = users[otherUserId];
    const messageDevisNumber = generateDemandeNumber(message);

    return (
      <div 
        key={message.id} 
        className={messageClass}
        style={message.status === 'en_attente_validation' ? {
          opacity: '0.8',
          position: 'relative',
          border: '1px dashed #f59e0b',
          padding: '8px',
          marginBottom: '24px'
        } : {}}
      >
        {message.status === 'en_attente_validation' && (
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '10px',
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            En attente de validation
          </div>
        )}
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

  // Fonction pour charger une conversation complète
  const loadConversation = (message) => {
    if (!message) return;
    
    const otherUserId = message.senderId === currentUser.uid 
      ? message.receiverId 
      : message.senderId;
    const demandeNumber = generateDemandeNumber(message);
    const groupKey = `${demandeNumber}_${otherUserId}`;
    const group = filteredGroups[groupKey];
    
    if (group) {
      setSelectedMessage({
        ...message,
        conversationGroup: group
      });
      markMessagesAsRead(group.messages);
    }
  };

  // Fonction pour rendre les conversations
  const renderGroupedConversations = () => {
    // Regrouper les conversations par numéro de demande
    const groupedByDemande = Object.entries(filteredGroups).reduce((acc, [groupKey, group]) => {
      const demandeNumber = group.demandeNumber;
      if (!acc[demandeNumber]) {
        acc[demandeNumber] = [];
      }
      acc[demandeNumber].push({ groupKey, group });
      return acc;
    }, {});

    // Trier les groupes par numéro de demande (plus récent en premier)
    return Object.entries(groupedByDemande)
      .sort(([demandeA], [demandeB]) => demandeB.localeCompare(demandeA))
      .map(([demandeNumber, conversations]) => (
        <div key={demandeNumber} className="demande-group">
          <div className="demande-header">
            {demandeNumber !== 'Sans numéro' ? (
              <h3>
                {demandeNumber.startsWith('DEM-') ? (
                  `Demande N° ${demandeNumber.substring(4)}`
                ) : (
                  `Devis N° ${demandeNumber.substring(4)}`
                )}
              </h3>
            ) : (
              <h3>Messages sans référence</h3>
            )}
          </div>
          <div className="demande-conversations">
            {conversations
              .sort((a, b) => getMessageDate(b.group.lastMessage) - getMessageDate(a.group.lastMessage))
              .map(({ groupKey, group }) => (
                <div
                  key={groupKey}
                  className={`professional-item ${selectedMessage?.conversationGroup === group ? 'selected' : ''}`}
                  onClick={() => loadConversation(group.lastMessage)}
                >
                  <div className="professional-info">
                    <h4>{group.professional.displayName || group.professional.companyName}</h4>
                    {group.lastMessage && (
                      <p className="last-message">
                        {group.lastMessage.content.substring(0, 50)}
                        {group.lastMessage.content.length > 50 ? '...' : ''}
                      </p>
                    )}
                    <p className="message-time">
                      {formatTimestamp(group.lastMessage?.timestamp)}
                    </p>
                  </div>
                  <div className="conversation-meta">
                    {group.unreadCount > 0 && (
                      <span className="unread-count">{group.unreadCount}</span>
                    )}
                    <div className="conversation-actions">
                      <RestoreButton conversation={group} />
                      {!showDeletedMessages && (
                        <button
                          className="delete-conversation-btn"
                          onClick={(e) => handleDeleteClick(
                            group.professional.id,
                            group.demandeNumber,
                            e
                          )}
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ));
  };

  // Fonction pour rendre les messages d'une conversation
  const renderConversationMessages = () => {
    if (!selectedMessage?.conversationGroup?.messages) return null;
    
    return selectedMessage.conversationGroup.messages
      .sort((a, b) => getMessageDate(a) - getMessageDate(b))
      .map(message => renderMessage(message));
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
              {showDeletedMessages ? (
                "Aucune conversation supprimée"
              ) : (
                "Aucune conversation"
              )}
            </div>
          ) : (
            renderGroupedConversations()
          )}
        </div>
      </div>
      {selectedMessage ? (
        <div className="conversation-view">
          <div className="conversation-header">
            {(() => {
              const otherUserId = selectedMessage.senderId === currentUser.uid 
                ? selectedMessage.receiverId 
                : selectedMessage.senderId;
              const otherUser = users[otherUserId];
              const demandeNumber = generateDemandeNumber(selectedMessage);
　
              return (
                <>
                  <h2>{otherUser?.displayName || otherUser?.companyName || 'Conversation'}</h2>
                  {demandeNumber !== 'Sans numéro' && (
                    <p className="devis-number">
                      {demandeNumber.startsWith('DEM-') ? (
                        `Demande N° ${demandeNumber.substring(4)}`
                      ) : (
                        `Devis N° ${demandeNumber.substring(4)}`
                      )}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
          <div className="messages-list">
            {renderConversationMessages()}
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
                <div className="message-input-actions">
                  <input
                    type="file"
                    id="file-input"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-input" className="file-input-label">
                    <span>Ajouter des images</span>
                  </label>
                  <button type="submit" disabled={isSending || !newMessage.trim()}>
                    {isSending ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </div>
              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="selected-file">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = [...selectedFiles];
                          newFiles.splice(index, 1);
                          setSelectedFiles(newFiles);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
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