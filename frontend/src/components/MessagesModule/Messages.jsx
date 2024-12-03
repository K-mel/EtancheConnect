import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  serverTimestamp, 
  arrayUnion 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validateMessageContent, sanitizeMessageContent } from '../../utils/messageValidation';
import { FaEnvelope } from 'react-icons/fa';
import './Messages.css';
import { createMessageNotification, createPendingMessageNotification } from '../../services/notificationService';


const Messages = () => {
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

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const initializeMessages = async () => {
      try {
        // Get user role first
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
        console.error("Erreur lors de l'initialisation:", error);
        setMessageError("Erreur lors du chargement des messages");
      }
    };

    initializeMessages();
  }, [currentUser, navigate]);

  useEffect(() => {
    const loadDeletedMessages = async () => {
      if (currentUser) {
        const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
        const deletedMessagesDoc = await getDoc(deletedMessagesRef);
        if (deletedMessagesDoc.exists()) {
          const deletedData = deletedMessagesDoc.data();
          setDeletedConversations(deletedData.deletedConversations || []);
        }
      }
    };

    loadDeletedMessages();
  }, [currentUser]);

  const fetchMessages = async (userRole) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setMessageError(null);

      // Fetch all users first
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData = {};
      usersSnapshot.forEach((doc) => {
        usersData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setUsers(usersData);

      // Récupérer la liste des conversations supprimées par l'utilisateur
      const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
      const deletedMessagesDoc = await getDoc(deletedMessagesRef);
      const deletedConvs = deletedMessagesDoc.exists() 
        ? deletedMessagesDoc.data().deletedConversations || []
        : [];
      
      // Mettre à jour l'état local des conversations supprimées
      setDeletedConversations(deletedConvs);

      // Requête pour récupérer les messages
      const messagesRef = collection(db, 'messages');
      let q;

      if (userRole === 'administrateur') {
        q = query(messagesRef);
      } else {
        q = query(
          messagesRef,
          where('participants', 'array-contains', currentUser.uid)
        );
      }

      const querySnapshot = await getDocs(q);
      const newMessages = [];

      querySnapshot.forEach((doc) => {
        const messageData = doc.data();
        const otherUserId = messageData.senderId === currentUser.uid 
          ? messageData.receiverId 
          : messageData.senderId;
        
        // Ne pas inclure les messages des conversations supprimées
        if (!deletedConvs.includes(otherUserId)) {
          newMessages.push({
            id: doc.id,
            ...messageData
          });
        }
      });

      //console.log('Messages chargés:', newMessages.length);
      setMessages(newMessages);

    } catch (error) {
      console.error("Erreur lors du chargement des messages:", error);
      setMessageError("Une erreur est survenue lors du chargement des messages");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (proId) => {
    try {
      // Créer ou mettre à jour le document de messages supprimés de l'utilisateur
      const deletedMessagesRef = doc(db, 'deletedMessages', currentUser.uid);
      const deletedMessagesDoc = await getDoc(deletedMessagesRef);
      
      // Préparer la nouvelle liste des conversations supprimées
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

      // Mettre à jour l'état local
      setDeletedConversations(newDeletedConversations);
      
      // Filtrer les messages
      setMessages(prevMessages => 
        prevMessages.filter(msg => {
          const autreUtilisateur = msg.senderId === currentUser.uid ? msg.receiverId : msg.senderId;
          return autreUtilisateur !== proId;
        })
      );

      // Réinitialiser le message sélectionné si nécessaire
      if (selectedMessage) {
        const autreUtilisateur = selectedMessage.senderId === currentUser.uid 
          ? selectedMessage.receiverId 
          : selectedMessage.senderId;
        if (autreUtilisateur === proId) {
          setSelectedMessage(null);
        }
      }

    } catch (error) {
      console.error('Erreur lors de la suppression de la conversation:', error);
      setMessageError('Erreur lors de la suppression de la conversation');
    }
  };

  const fetchPendingMessages = async () => {
    if (userRole !== 'administrateur') return;

    try {
      const messagesRef = collection(db, 'messages');
      const pendingQuery = query(
        messagesRef,
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(pendingQuery);
      const pendingMsgs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPendingMessages(pendingMsgs);
    } catch (error) {
      console.error("Erreur lors de la récupération des messages en attente:", error);
    }
  };

  const handleFileSelect = (event) => {
    if (!currentUser) return;

    const files = Array.from(event.target.files);
   // console.log("Fichiers sélectionnés:", files);
    
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
     // console.log("Vérification du fichier:", file.name, "Type:", file.type, "Taille:", file.size);
      return isValid && isValidSize;
    });

  //  console.log("Fichiers valides:", validFiles);

    if (validFiles.length !== files.length) {
      setMessageError("Certains fichiers ont été ignorés. Seules les images de moins de 5MB sont acceptées.");
    }

    setSelectedFiles(validFiles);
  };

  const uploadImages = async (files) => {
    if (!currentUser) return [];
    
    const uploadedUrls = [];
    
    for (const file of files) {
      const fileName = `message_images/${Date.now()}_${file.name}`;
      const imageRef = ref(storage, fileName);
      
      try {
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        uploadedUrls.push(url);
      } catch (error) {
        console.error("Erreur lors de l'upload de l'image:", error);
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedMessage || !newMessage.trim()) return;

    try {
      setIsSending(true);
      const receiverId = selectedMessage.senderId === currentUser.uid
        ? selectedMessage.receiverId
        : selectedMessage.senderId;

      const messageData = {
        content: newMessage.trim(),
        senderId: currentUser.uid,
        receiverId: receiverId,
        timestamp: serverTimestamp(),
        status: 'pending',
        read: false,
        participants: [currentUser.uid, receiverId],
        files: []
      };

      const uploadedFiles = await uploadImages(selectedFiles);
      if (uploadedFiles.length > 0) {
        messageData.files = uploadedFiles;
      }

      // Ajouter le message à Firestore
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      
      // Créer une notification pour l'administrateur
      await createPendingMessageNotification(currentUser.uid, { 
        ...messageData, 
        id: docRef.id 
      });

      setNewMessage('');
      setSelectedFiles([]);
      setMessageError('');

      // Refresh messages
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        await fetchMessages(role);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setMessageError('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
};

// Dans Messages.jsx
const approveMessage = async (messageId) => {
  try {
    console.log('=== Début de l\'approbation ===');
    console.log('messageId:', messageId);
    
    const messageRef = doc(db, 'messages', messageId);
    const messageSnapshot = await getDoc(messageRef);
    
    if (!messageSnapshot.exists()) {
      console.error('Message non trouvé');
      return;
    }

    const messageData = messageSnapshot.data();
    console.log('=== Données complètes du message ===', {
      id: messageId,
      ...messageData,
      createdAt: messageData.createdAt?.toDate?.(),
      receiverId: messageData.receiverId,
      senderId: messageData.senderId,
      content: messageData.content
    });

    // Vérifier que nous avons bien les IDs nécessaires
    if (!messageData.receiverId || !messageData.senderId) {
      console.error('Message invalide - IDs manquants:', messageData);
      return;
    }

    await updateDoc(messageRef, {
      status: 'approved',
      approvedAt: serverTimestamp()
    });

    try {
      console.log('=== Tentative de création de notification ===');
      console.log('receiverId:', messageData.receiverId);
      console.log('senderId:', messageData.senderId);
      console.log('messageData:', { ...messageData, id: messageId });
      
      const notificationId = await createMessageNotification(
        messageData.receiverId,
        messageData.senderId,
        { ...messageData, id: messageId },
        true
      );
      console.log('=== Notification créée avec succès ===');
      console.log('notificationId:', notificationId);
    } catch (notifError) {
      console.error('=== Erreur de notification ===', notifError);
      console.error('Stack trace:', notifError.stack);
    }

    // Refresh messages for admin
    if (userRole === 'administrateur') {
      await fetchMessages(userRole);
      await fetchPendingMessages();
    }

    setMessageError('Message approuvé avec succès');
  } catch (error) {
    console.error('=== Erreur générale ===', error);
    console.error('Stack trace:', error.stack);
    setMessageError('Erreur lors de l\'approbation du message');
  }
};
  const rejectMessage = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        console.error('Message non trouvé');
        return;
      }

      await updateDoc(messageRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });

      // Refresh messages for admin
      if (userRole === 'administrateur') {
        await fetchMessages(userRole);
        await fetchPendingMessages();
      }

      setMessageError('Message rejeté');
      setTimeout(() => setMessageError(''), 3000);
    } catch (error) {
      console.error('Erreur lors du rejet du message:', error);
      setMessageError('Erreur lors du rejet du message');
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) return;
      
      const messageData = messageDoc.data();
      if (messageData.receiverId === currentUser.uid && !messageData.read) {
        await updateDoc(messageRef, {
          read: true,
          readAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
    }
  };

  useEffect(() => {
    if (selectedMessage) {
      markMessageAsRead(selectedMessage.id);
    }
  }, [selectedMessage]);

  const filterMessages = (messages) => {
    if (!messages || !userRole) return [];
    
    return messages.filter(msg => {
      // Les administrateurs voient tous les messages
      if (userRole === 'administrateur') return true;
      
      // Le sender voit ses propres messages en attente
      if (msg.senderId === currentUser?.uid) return true;
      
      // Les autres ne voient que les messages approuvés
      return msg.status === 'approved';
    });
  };

  const groupMessagesByProfessional = (messages) => {
    const groups = {};
    
    // Add null check and ensure messages is an array
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
        
        // N'ajouter que les messages visibles selon le rôle
        if (filterMessages([message]).length > 0) {
          groups[otherUserId].messages.push(message);
          
          if (!message.read && message.senderId === otherUserId) {
            groups[otherUserId].unreadCount++;
          }
        }
      }
    });

    // Sort messages in each group
    Object.values(groups).forEach(group => {
      if (group.messages.length > 0) {
        group.messages.sort(sortMessages);
        group.lastMessage = group.messages[0];
      }
    });

    // Ne retourner que les groupes qui ont des messages visibles
    return Object.fromEntries(
      Object.entries(groups).filter(([_, group]) => group.messages.length > 0)
    );
  };

  const getMessageDate = (message) => {
    if (!message?.timestamp) return new Date(0);
    
    if (message.timestamp.toDate && typeof message.timestamp.toDate === 'function') {
      return message.timestamp.toDate();
    }
    
    return new Date(message.timestamp);
  };

  const sortMessages = (a, b) => {
    const dateA = getMessageDate(a);
    const dateB = getMessageDate(b);
    return dateA - dateB;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    // Handle Firestore Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    
    // Handle regular Date object or timestamp number
    return new Date(timestamp).toLocaleString();
  };

  const MessageStatus = ({ status }) => {
    const getStatusStyle = (status) => {
      switch (status) {
        case 'approved':
          return 'status-badge approved';
        case 'pending':
          return 'status-badge pending';
        case 'rejected':
          return 'status-badge rejected';
        case 'en_attente_validation':
          return 'status-badge pending';
        default:
          return 'status-badge';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'approved':
          return '✓';
        case 'pending':
          return '⌛';
        case 'rejected':
          return '✕';
        case 'en_attente_validation':
          return '⌛';
        default:
          return '?';
      }
    };

    return (
      <span className={getStatusStyle(status)}>
        {getStatusIcon(status)} {getMessageStatus(status)}
      </span>
    );
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.senderId === currentUser?.uid;
    const messageClass = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
    const isPending = message.status === 'pending' || message.status === 'en_attente_validation';
    const isRejected = message.status === 'rejected';
    const otherUserId = isOwnMessage ? message.receiverId : message.senderId;
    const otherUser = users[otherUserId];

    return (
      <div key={message.id} className={messageClass}>
        <div className="message-content">
          {message.content}
          <MessageStatus status={message.status} />
          {userRole === 'administrateur' && isPending && (
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

  const handleImageClick = (url) => {
    setSelectedImageUrl(url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedImageUrl(null);
    setIsModalOpen(false);
  };

  const getMessageStatus = (status) => {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejeté';
      case 'en_attente_validation':
        return 'En attente de validation';
      default:
        return status;
    }
  };

  const handleDeleteClick = (proId, e) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer cette conversation ? Elle sera masquée de votre liste mais restera accessible à l\'autre utilisateur.')) {
      handleDeleteConversation(proId);
    }
  };

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return <div className="loading">Chargement des messages...</div>;
  }

  //console.log('Current messages state:', messages); // Debug log
  // Group messages only once during render
  const professionalGroups = messages && Array.isArray(messages) ? groupMessagesByProfessional(messages) : {};
  //console.log('Professional groups:', professionalGroups); // Debug log

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
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isSending}
                />
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