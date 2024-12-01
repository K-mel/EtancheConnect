import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validateMessageContent, sanitizeMessageContent } from '../../utils/messageValidation';
import { FaEnvelope } from 'react-icons/fa';
import './Messages.css';

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

  const fetchMessages = async (userRole) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const messagesRef = collection(db, 'messages');
      
      let messagesQuery;
      
      if (userRole === 'administrateur') {
        // Admin sees all messages
        messagesQuery = query(
          messagesRef,
          where('participants', 'array-contains', currentUser.uid)
        );
      } else if (userRole === 'professionnel') {
        // Professional sees only approved messages
        messagesQuery = query(
          messagesRef,
          where('participants', 'array-contains', currentUser.uid),
          where('status', '==', 'approved')
        );
      } else {
        // Particulier sees only approved messages
        messagesQuery = query(
          messagesRef,
          where('participants', 'array-contains', currentUser.uid),
          where('status', '==', 'approved')
        );
      }

      const querySnapshot = await getDocs(messagesQuery);
      const fetchedMessages = [];
      const userIds = new Set();

      // Trier les messages côté client
      querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .forEach((messageData) => {
          fetchedMessages.push(messageData);
          if (messageData.senderId) userIds.add(messageData.senderId);
          if (messageData.receiverId) userIds.add(messageData.receiverId);
        });

      // Récupérer les informations des utilisateurs
      const usersData = {};
      for (const userId of userIds) {
        if (userId !== currentUser.uid) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            usersData[userId] = {
              ...userData,
              displayName: userData.role === 'particulier' 
                ? userData.nom 
                : userData.displayName
            };
          }
        }
      }

      setUsers(usersData);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Erreur lors de la récupération des messages:", error);
    } finally {
      setLoading(false);
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
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
      return isValid && isValidSize;
    });

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

      await addDoc(collection(db, 'messages'), messageData);
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

  const approveMessage = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        console.error('Message non trouvé');
        return;
      }

      await updateDoc(messageRef, {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      // Refresh messages for admin
      if (userRole === 'administrateur') {
        await fetchMessages(userRole);
        await fetchPendingMessages();
      }

      setMessageError('Message approuvé avec succès');
      setTimeout(() => setMessageError(''), 3000);
    } catch (error) {
      console.error('Erreur lors de la validation du message:', error);
      setMessageError('Erreur lors de la validation du message');
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

  const groupMessagesByProfessional = () => {
    const groups = {};
    
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

  const renderMessage = (message) => {
    const isOwnMessage = message.senderId === currentUser?.uid;
    const messageClass = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
    const isPending = message.status === 'pending';
    const isRejected = message.status === 'rejected';

    return (
      <div key={message.id} className={messageClass}>
        <div className="message-content">
          {message.content}
          {isPending && <span className="pending-badge">En attente de validation</span>}
          {isRejected && <span className="rejected-badge">Rejeté</span>}
          {userRole === 'administrateur' && isPending && (
            <button 
              className="approve-message-btn"
              onClick={() => approveMessage(message.id)}
            >
              Valider
            </button>
          )}
          {userRole === 'administrateur' && isPending && (
            <button 
              className="reject-message-btn"
              onClick={() => rejectMessage(message.id)}
            >
              Rejeter
            </button>
          )}
        </div>
        {message.files && message.files.length > 0 && (
          <div className="message-files">
            {message.files.map((file, index) => (
              <a 
                key={index} 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="file-link"
              >
                {file.name}
              </a>
            ))}
          </div>
        )}
        <div className="message-timestamp">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return <div className="loading">Chargement des messages...</div>;
  }

  const professionalGroups = groupMessagesByProfessional();

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
                      onClick={(e) => {
                        e.stopPropagation();
                        // handleDeleteConversation(proId);
                      }}
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
                : selectedMessage.senderId]?.messages || [])
                .sort(sortMessages)
                .map(renderMessage)}
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
    </div>
  );
};

export default Messages;