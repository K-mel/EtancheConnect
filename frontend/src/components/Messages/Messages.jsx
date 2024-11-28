import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
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

  useEffect(() => {
    // Rediriger si l'utilisateur n'est pas connecté
    if (!currentUser) {
      navigate('/login');
      return;
    }

    fetchMessages();
    if (currentUser.role === 'admin') {
      fetchPendingMessages();
    }
  }, [currentUser, navigate]);

  const fetchMessages = async () => {
    if (!currentUser) return;

    try {
      // Première requête pour obtenir les messages par participants
      const messagesRef = collection(db, 'messages');
      const participantsQuery = query(
        messagesRef,
        where('participants', 'array-contains', currentUser.uid)
      );

      const querySnapshot = await getDocs(participantsQuery);
      const fetchedMessages = [];
      const userIds = new Set();

      // Trier les messages côté client
      querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach((messageData) => {
          fetchedMessages.push(messageData);
          userIds.add(messageData.senderId);
          userIds.add(messageData.recipientId);
        });

      // Récupérer les informations des utilisateurs
      const usersData = {};
      for (const userId of userIds) {
        if (userId !== currentUser.uid) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            usersData[userId] = userDoc.data();
          }
        }
      }

      setUsers(usersData);
      setMessages(fetchedMessages);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des messages:", error);
      setLoading(false);
    }
  };

  const fetchPendingMessages = async () => {
    try {
      const messagesRef = collection(db, 'messages');
      const pendingQuery = query(
        messagesRef,
        where('images', '!=', []),
        where('imagesApproved', '==', false)
      );

      const querySnapshot = await getDocs(pendingQuery);
      const pendingMsgs = [];
      const userIds = new Set();

      querySnapshot.docs.forEach((doc) => {
        const messageData = { id: doc.id, ...doc.data() };
        pendingMsgs.push(messageData);
        userIds.add(messageData.senderId);
        userIds.add(messageData.recipientId);
      });

      // Récupérer les informations des utilisateurs si pas déjà chargées
      const usersData = { ...users };
      for (const userId of userIds) {
        if (!usersData[userId] && userId !== currentUser.uid) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            usersData[userId] = userDoc.data();
          }
        }
      }

      setUsers(usersData);
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentUser || (!newMessage.trim() && selectedFiles.length === 0)) return;

    try {
      let messageContent = newMessage.trim();
      if (messageContent) {
        const validation = validateMessageContent(messageContent);
        if (!validation.isValid) {
          setMessageError(validation.error);
          return;
        }
        messageContent = sanitizeMessageContent(messageContent);
      }

      let imageUrls = [];
      if (selectedFiles.length > 0) {
        imageUrls = await uploadImages(selectedFiles);
      }

      const messagesRef = collection(db, 'messages');
      const messageData = {
        content: messageContent,
        senderId: currentUser.uid,
        recipientId: selectedMessage.senderId === currentUser.uid 
          ? selectedMessage.recipientId 
          : selectedMessage.senderId,
        timestamp: new Date().toISOString(),
        read: false,
        participants: [currentUser.uid, selectedMessage.senderId === currentUser.uid 
          ? selectedMessage.recipientId 
          : selectedMessage.senderId],
        images: imageUrls,
        imagesApproved: currentUser.role === 'admin',
        isPro: currentUser.role === 'professional'
      };

      await addDoc(messagesRef, messageData);
      setNewMessage('');
      setMessageError('');
      setSelectedFiles([]);
      setUploadProgress(0);
      fetchMessages();
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      setMessageError("Une erreur est survenue lors de l'envoi du message.");
    }
  };

  const approveImage = async (messageId) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        imagesApproved: true
      });
      fetchMessages();
    } catch (error) {
      console.error("Erreur lors de l'approbation de l'image:", error);
      setMessageError("Une erreur est survenue lors de l'approbation de l'image.");
    }
  };

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return <div className="loading">Chargement des messages...</div>;
  }

  const renderMessageContent = (message) => {
    if (!message) return null;

    return (
      <div className="message-content">
        {message.content && (
          <div className="message-text">
            {message.content}
          </div>
        )}
        {message.images && message.images.length > 0 && (
          <div className="message-images">
            {message.images.map((imageUrl, index) => (
              <div key={index} className="message-image-container">
                {message.imagesApproved ? (
                  <img 
                    src={imageUrl} 
                    alt={`Image ${index + 1}`} 
                    className="message-image"
                  />
                ) : (
                  <div className="pending-image">
                    <span>Image en attente d'approbation</span>
                    {currentUser?.role === 'admin' && (
                      <button 
                        onClick={() => approveImage(message.id)}
                        className="approve-button"
                      >
                        Approuver
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="messages-container">
      <div className="messages-list">
        <div className="messages-header">
          <h3>Messages</h3>
          {currentUser.role === 'admin' && (
            <div className="messages-filter">
              <button
                className={`filter-button ${showPendingOnly ? 'active' : ''}`}
                onClick={() => setShowPendingOnly(!showPendingOnly)}
              >
                {showPendingOnly ? 'Voir tous les messages' : 'Photos à valider'}
                {pendingMessages.length > 0 && (
                  <span className="pending-count">{pendingMessages.length}</span>
                )}
              </button>
            </div>
          )}
        </div>

        {(showPendingOnly ? pendingMessages : messages).length === 0 ? (
          <div className="no-messages">
            <FaEnvelope size={40} />
            <p>Aucun message</p>
          </div>
        ) : (
          (showPendingOnly ? pendingMessages : messages).map((message) => (
            <div
              key={message.id}
              className={`message-preview ${selectedMessage?.id === message.id ? 'selected' : ''}`}
              onClick={() => setSelectedMessage(message)}
            >
              <div className="message-preview-header">
                <span className="user-name">
                  {message.senderId === currentUser?.uid 
                    ? users[message.recipientId]?.displayName || users[message.recipientId]?.companyName || 'Utilisateur'
                    : users[message.senderId]?.displayName || users[message.senderId]?.companyName || 'Utilisateur'}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="message-preview-content">
                <p>
                  {message.content || ''}
                  {message.images?.length > 0 && (
                    <span className="image-indicator">
                      {message.images.length} photo(s)
                      {!message.imagesApproved && (
                        <span className="pending-badge">En attente</span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      {selectedMessage && (
        <div className="message-detail">
          <div className="message-detail-header">
            <h3>Conversation</h3>
          </div>
          <div className="message-detail-content">
            <div className="message-bubble">
              <div className="message-info">
                <span className="sender-name">
                  {selectedMessage.senderId === currentUser?.uid 
                    ? 'Moi' 
                    : users[selectedMessage.senderId]?.displayName || users[selectedMessage.senderId]?.companyName || 'Utilisateur'}
                </span>
                <span className="message-time">
                  {new Date(selectedMessage.timestamp).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {renderMessageContent(selectedMessage)}
            </div>
          </div>
          <div className="message-reply">
            <form onSubmit={sendMessage}>
              {messageError && (
                <div className="message-error">
                  {messageError}
                </div>
              )}
              <textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  setMessageError('');
                }}
                placeholder="Écrivez votre réponse... (Les numéros de téléphone, emails et liens seront automatiquement masqués)"
                rows="3"
              />
              <div className="message-actions">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="file-input"
                  id="file-input"
                />
                <label htmlFor="file-input" className="file-input-label">
                  📎 Ajouter des photos
                </label>
                {selectedFiles.length > 0 && (
                  <div className="selected-files">
                    {selectedFiles.length} photo(s) sélectionnée(s)
                  </div>
                )}
                <button type="submit" disabled={!newMessage.trim() && selectedFiles.length === 0}>
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
