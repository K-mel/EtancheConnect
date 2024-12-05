import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  getDoc, 
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import ProfessionalQuoteForm from '../QuoteModule/ProfessionalQuoteForm';
import { validateMessageContent, sanitizeMessageContent } from '../../utils/messageValidation';
import { validateQuestionContent } from '../../utils/questionValidation';
import { formatDevisNumber } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import './styles/devis.css';
import './DevisList.css';

const DevisList = ({ userType }) => {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editForm, setEditForm] = useState({
    description: '',
    surface: '',
    ville: '',
    typeProjet: '',
    address: '',
    codePostal: ''
  });
  const [messageContent, setMessageContent] = useState('');
  const [messageError, setMessageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [devisAmount, setDevisAmount] = useState('');
  const [devisDetails, setDevisDetails] = useState('');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionContent, setQuestionContent] = useState('');
  const [devisWithMessages, setDevisWithMessages] = useState(new Set());
  const [searchDevisNumber, setSearchDevisNumber] = useState('');
  const [professionalQuotes, setProfessionalQuotes] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const { currentUser } = useAuth();

  const setupMessagesListener = useCallback(() => {
    if (!currentUser || userType !== 'professionnel') return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('senderId', '==', currentUser.uid),
      where('type', '==', 'question')
    );

    return onSnapshot(q, (snapshot) => {
      const activeMessages = new Set();
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        // Vérification du statut deleted dans le code plutôt que dans la requête
        if (messageData.devisId && messageData.deleted !== true) {
          activeMessages.add(messageData.devisId);
        }
      });
      setDevisWithMessages(activeMessages);
    }, (error) => {
      console.error("Erreur lors de l'écoute des messages:", error);
    });
  }, [currentUser, userType]);

  useEffect(() => {
    const unsubscribe = setupMessagesListener();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [setupMessagesListener]);

  const fetchDevis = useCallback(async () => {
    setLoading(true);
    try {
      let q;
      
      switch (userType) {
        case 'particulier':
          q = query(
            collection(db, 'devis'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          break;
        
        case 'professionnel':
          q = query(
            collection(db, 'devis'),
            where('status', '==', 'valide'),
            orderBy('createdAt', 'desc')
          );
          break;
        
        case 'administrateur':
          q = query(
            collection(db, 'devis'),
            orderBy('createdAt', 'desc')
          );
          break;
        
        default:
          throw new Error('Type d\'utilisateur non reconnu');
      }

      const querySnapshot = await getDocs(q);
      const devisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(0)
      }));

      const sortedDevis = devisData.sort((a, b) => b.createdAt - a.createdAt);

      const formattedDevis = sortedDevis.map(devis => ({
        ...devis,
        createdAt: devis.createdAt.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      setDevis(formattedDevis);
    } catch (error) {
      console.error('Erreur lors de la récupération des devis:', error);
      setError('Une erreur est survenue lors du chargement des devis.');
    } finally {
      setLoading(false);
    }
  }, [userType, currentUser]);

  const getStatusLabel = (status) => {
    const statusLabels = {
      'en_attente': 'En attente',
      'en_discussion': 'En discussion',
      'en_attente_signature': 'En attente de signature',
      'signe': 'Signé',
      'refuse': 'Refusé',
      'annule': 'Annulé',
      'valide': 'Validé',
      'devis_envoye': 'Devis envoyé',
      'accepte': 'Accepté',
      'en_attente_validation': 'En attente validation'
    };
    return statusLabels[status] || status;
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      'en_attente': 'status-waiting',
      'en_discussion': 'status-discussion',
      'en_attente_signature': 'status-pending-signature',
      'signe': 'status-signed',
      'refuse': 'status-refused',
      'annule': 'status-cancelled',
      'valide': 'status-valid',
      'devis_envoye': 'status-sent',
      'accepte': 'status-accepted',
      'en_attente_validation': 'status-waiting'
    };
    return `status ${statusClasses[status] || 'status-default'}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleValidateDevis = async (devisId) => {
    try {
      await updateDoc(doc(db, 'devis', devisId), {
        status: 'valide',
        validatedAt: serverTimestamp()
      });
      
      // Rafraîchir la liste des devis
      fetchDevis();
    } catch (error) {
      console.error('Erreur lors de la validation du devis:', error);
      setError('Une erreur est survenue lors de la validation du devis.');
    }
  };

  const handleRefuseDevis = async (devisId) => {
    try {
      await updateDoc(doc(db, 'devis', devisId), {
        status: 'refuse',
        refusedAt: serverTimestamp()
      });
      
      // Rafraîchir la liste des devis
      fetchDevis();
    } catch (error) {
      console.error('Erreur lors du refus du devis:', error);
      setError('Une erreur est survenue lors du refus du devis.');
    }
  };

  const handleSendMessage = async () => {
    try {
      setMessageError('');
      setIsSubmitting(true);

      // Valider le contenu du message
      const validation = validateMessageContent(messageContent);
      if (!validation.isValid) {
        setMessageError(validation.error);
        return;
      }

      // Créer le nouveau message
      const messageData = {
        senderId: currentUser.uid,
        recipientId: selectedDevis.userId,
        content: sanitizeMessageContent(messageContent),
        devisId: selectedDevis.id,
        createdAt: serverTimestamp(),
        read: false,
        type: 'devis_question',
        participants: [currentUser.uid, selectedDevis.userId]
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Mettre à jour le statut du devis
      await updateDoc(doc(db, 'devis', selectedDevis.id), {
        status: 'attente_reponse',
        lastUpdated: serverTimestamp()
      });

      // Réinitialiser le formulaire et fermer le modal
      setMessageContent('');
      setSelectedDevis(null);
      
      // Rafraîchir la liste des devis
      fetchDevis();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setMessageError('Une erreur est survenue lors de l\'envoi du message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendDevis = async () => {
    try {
      setMessageError('');
      setIsSubmitting(true);

      // Validation du montant
      if (!devisAmount || isNaN(devisAmount) || devisAmount <= 0) {
        setMessageError('Veuillez entrer un montant valide');
        return;
      }

      // Validation des détails
      if (!devisDetails.trim()) {
        setMessageError('Veuillez fournir les détails du devis');
        return;
      }

      // Créer le devis
      const devisData = {
        montant: parseFloat(devisAmount),
        details: devisDetails.trim(),
        devisId: selectedDevis.id,
        professionnelId: currentUser.uid,
        status: 'devis_envoye',
        createdAt: serverTimestamp()
      };

      // Enregistrer le devis dans Firestore
      await addDoc(collection(db, 'devis_reponses'), devisData);

      // Mettre à jour le statut du devis original
      await updateDoc(doc(db, 'devis', selectedDevis.id), {
        status: 'devis_envoye',
        lastUpdated: serverTimestamp()
      });

      // Réinitialiser le formulaire
      setDevisAmount('');
      setDevisDetails('');
      setSelectedDevis(null);
      
      // Rafraîchir la liste des devis
      fetchDevis();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du devis:', error);
      setMessageError('Une erreur est survenue lors de l\'envoi du devis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuestionSubmit = async (devisId, particulierId) => {
    const validation = validateQuestionContent(questionContent);
    if (!validation.isValid) {
      setMessageError(validation.error);
      return;
    }

    try {
      setIsSubmitting(true);

      // Créer le message dans la collection messages
      const messageData = {
        content: questionContent,
        createdAt: serverTimestamp(),
        senderId: currentUser.uid,
        receiverId: particulierId,
        devisId: devisId,
        role: 'professionnel',
        status: 'en_attente_validation',
        type: 'question',
        participants: [currentUser.uid, particulierId],
        deleted: false
      };

      const messageRef = await addDoc(collection(db, 'messages'), messageData);

      const notificationData = {
        type: 'NEW_MESSAGE',  // Utiliser un des types existants
        title: 'Nouveau message à valider',
        message: `Un professionnel a posé une question sur un devis : "${questionContent.substring(0, 50)}${questionContent.length > 50 ? '...' : ''}"`,
        devisId: devisId,
        messageId: messageRef.id,
        senderId: currentUser.uid,
        senderRole: 'professionnel',
        userId: 'YnxY2NZj9lNYAXZVqzAc5mY7AHy1',
        receiverId: 'YnxY2NZj9lNYAXZVqzAc5mY7AHy1',
        messageContent: questionContent,
        createdAt: serverTimestamp(),
        read: false,
        status: 'unread',
        requiresAction: true
      };
      

      await addDoc(collection(db, 'notifications'), notificationData);

      // Réinitialiser le formulaire
      setQuestionContent('');
      setIsQuestionModalOpen(false);
      setMessageError('');
      
      // Afficher un message de confirmation
      alert('Votre message a été envoyé et est en attente de validation par l\'administrateur. Vous pouvez le consulter dans l\'onglet Messages.');

    } catch (error) {
      setMessageError('Erreur lors de l\'envoi de la question: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    setEditForm({
      description: selectedDevis.description || '',
      surface: selectedDevis.surface || '',
      ville: selectedDevis.ville || '',
      typeProjet: selectedDevis.typeProjet || '',
      address: selectedDevis.address || '',
      codePostal: selectedDevis.codePostal || ''
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const devisRef = doc(db, 'devis', selectedDevis.id);
      await updateDoc(devisRef, {
        ...editForm,
        lastUpdated: serverTimestamp()
      });
      
      // Mettre à jour l'état local
      setSelectedDevis({
        ...selectedDevis,
        ...editForm
      });
      setIsEditing(false);
      fetchDevis(); // Rafraîchir la liste
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      alert('Une erreur est survenue lors de la modification du devis');
    }
  };

  const handleSendQuote = (devisData) => {
    setSelectedDevis(devisData);
    setShowQuoteForm(true);
  };

  const handleCloseQuoteForm = () => {
    setShowQuoteForm(false);
    setSelectedDevis(null);
  };

  const renderActions = (devis) => {
    if (userType === 'administrateur' && devis.status === 'en_attente') {
      return (
        <>
          <button 
            className="action-button validate"
            onClick={() => handleValidateDevis(devis.id)}
          >
            Valider
          </button>
          <button 
            className="action-button refuse"
            onClick={() => handleRefuseDevis(devis.id)}
          >
            Refuser
          </button>
        </>
      );
    }
    
    return (
      <div className="action-buttons">
        <button 
          className="view-button"
          onClick={() => setSelectedDevis(devis)}
        >
          Voir
        </button>
        {userType === 'professionnel' && devis.status === 'valide' && (
          <Link 
            to={`/devis-professionnel/${devis.id}`}
            className="action-button envoyer-devis"
          >
            Envoyer un devis
          </Link>
        )}
      </div>
    );
  };

  const renderModalContent = () => {
    if (!selectedDevis) return null;

    return (
      <div className="devis-modal" onClick={() => setSelectedDevis(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{isEditing ? 'Modifier le devis' : 'Détails du devis'}</h3>
            <button className="close-button" onClick={() => {
              setSelectedDevis(null);
              setIsEditing(false);
            }}>&times;</button>
          </div>

          {isEditing && userType === 'particulier' ? (
            <div className="devis-form">
              <div className="form-group">
                <label>Description du projet</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Description détaillée des travaux"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Surface (m²)</label>
                <input
                  type="number"
                  value={editForm.surface}
                  onChange={(e) => setEditForm({...editForm, surface: e.target.value})}
                  placeholder="Surface en m²"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Type de projet</label>
                <select
                  value={editForm.typeProjet}
                  onChange={(e) => setEditForm({...editForm, typeProjet: e.target.value})}
                  className="form-input"
                >
                  <option value="">Sélectionnez un type</option>
                  <option value="etancheite">Étanchéité</option>
                  <option value="isolation">Isolation</option>
                  <option value="renovation">Rénovation</option>
                </select>
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                  placeholder="Adresse complète"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Ville</label>
                <input
                  type="text"
                  value={editForm.ville}
                  onChange={(e) => setEditForm({...editForm, ville: e.target.value})}
                  placeholder="Ville"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Code Postal</label>
                <input
                  type="text"
                  value={editForm.codePostal}
                  onChange={(e) => setEditForm({...editForm, codePostal: e.target.value})}
                  placeholder="Code postal"
                  className="form-input"
                />
              </div>
              <div className="button-group">
                <button onClick={handleSaveEdit} className="submit-button">
                  Enregistrer les modifications
                </button>
                <button onClick={() => setIsEditing(false)} className="cancel-button">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="devis-details">
              <p><strong>N° Demande:</strong> <span className="devis-number">{formatDevisNumber(selectedDevis.id)}</span></p>
              <p><strong>Date:</strong> {selectedDevis.createdAt}</p>
              <p><strong>Type de projet:</strong> {selectedDevis.typeProjet}</p>
              <p><strong>Surface:</strong> {selectedDevis.surface} m²</p>
              <p><strong>Adresse:</strong> {selectedDevis.address}</p>
              <p><strong>Ville:</strong> {selectedDevis.ville}</p>
              <p><strong>Code Postal:</strong> {selectedDevis.codePostal}</p>
              <p><strong>Status:</strong> <span className={getStatusClass(selectedDevis.status)}>{getStatusLabel(selectedDevis.status)}</span> {selectedDevis.validatedAt && <span> - Validé le {formatTimestamp(selectedDevis.validatedAt)}</span>}</p>
              <p><strong>Description:</strong> {selectedDevis.description || 'Aucune description'}</p>

              {userType === 'particulier' && selectedDevis.status !== 'refuse' && (
                <button onClick={handleEditClick} className="submit-button">
                  Modifier le devis
                </button>
              )}
　
　
              {selectedDevis.photos && selectedDevis.photos.length > 0 && (
                <div>
                  <h4>Photos du projet</h4>
                  <div className="devis-images">
                    {selectedDevis.photos.map((photo, index) => (
                      <div key={index} className="devis-image-container">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="devis-image"
                          onClick={() => setSelectedImage(photo)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFullscreenImage = () => {
    if (!selectedImage) return null;
    
    return (
      <div className="fullscreen-image" onClick={() => setSelectedImage(null)}>
        <img src={selectedImage} alt="Image en plein écran" />
      </div>
    );
  };

  useEffect(() => {
    if (currentUser && userType) {
      fetchDevis();
    }
  }, [currentUser, userType, fetchDevis]);

  // Fonction pour filtrer les devis
  const getFilteredDevis = () => {
    if (!searchDevisNumber || userType !== 'professionnel') return devis;
    
    return devis.filter(d => {
      const devisNumber = formatDevisNumber(d.id);
      return devisNumber.toLowerCase().includes(searchDevisNumber.toLowerCase().trim());
    });
  };

  const filteredDevis = getFilteredDevis();

  // Charger les devis professionnels
  useEffect(() => {
    if (currentUser && userType === 'professionnel') {
      // Modification de la requête pour utiliser un index simple
      const q = query(
        collection(db, 'professionalQuotes'),
        where('professionalId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Trier les données côté client
        .sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.seconds - a.createdAt.seconds;
        });
        
        setProfessionalQuotes(quotesData);
      });

      return () => unsubscribe();
    }
  }, [currentUser, userType]);

  // Fonction pour formater le montant
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="devis-list-container">
      <div className="devis-header">
        {userType === 'professionnel' && (
          <div className="search-devis-container">
            <input
              type="search"
              placeholder="Rechercher par numéro de devis (ex: DEV-001)"
              value={searchDevisNumber}
              onChange={(e) => setSearchDevisNumber(e.target.value)}
              className="search-devis-input"
            />
          </div>
        )}
      </div>

      {showQuoteForm && selectedDevis && (
        <ProfessionalQuoteForm
          devisData={selectedDevis}
          onClose={() => {
            setShowQuoteForm(false);
            setSelectedDevis(null);
          }}
        />
      )}
      <div className="devis-tabs">
        <div className="tab-content">
          <div className="devis-list-container">
            {loading ? (
              <div className="loading-spinner">Chargement...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <div className="devis-table-container">
                {devis.length === 0 ? (
                  <p className="no-devis-message">Aucun devis disponible</p>
                ) : (
                  <table className="devis-table">
                    <thead>
                      <tr>
                        <th>N° Demande</th>
                        <th>Date</th>
                        <th>Type de projet</th>
                        <th>Surface</th>
                        <th>Ville</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevis.map((devis) => (
                        <tr key={devis.id} className={devis.status}>
                          <td>{formatDevisNumber(devis.id)}</td>
                          <td>{devis.createdAt}</td>
                          <td>{devis.typeProjet}</td>
                          <td>{devis.surface} m²</td>
                          <td>{devis.ville}</td>
                          <td>
                            <span className={getStatusClass(devis.status)}>
                              {getStatusLabel(devis.status)}
                            </span>
                          </td>
                          <td>
                            <div className="devis-actions-cell">
                              <button 
                                onClick={() => setSelectedDevis(devis)} 
                                className="action-button voir"
                              >
                                Voir
                              </button>
                              {userType === 'professionnel' && devis.status === 'valide' && (
                                <Link 
                                  to={`/devis-professionnel/${devis.id}`}
                                  className="action-button envoyer-devis"
                                >
                                  Envoyer un devis
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {renderModalContent()}
      {renderFullscreenImage()}

      {/* Modal pour poser une question */}
      {isQuestionModalOpen && selectedDevis && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Poser une question sur le devis</h3>
            {messageError && <div className="error-message">{messageError}</div>}
            <textarea
              value={questionContent}
              onChange={(e) => setQuestionContent(e.target.value)}
              placeholder="Écrivez votre question ici..."
              className="question-textarea"
            />
            <div className="modal-actions">
              <button
                onClick={() => handleQuestionSubmit(selectedDevis.id, selectedDevis.userId)}
                disabled={isSubmitting}
                className="submit-btn"
              >
                {isSubmitting ? 'Envoi...' : 'Envoyer'}
              </button>
              <button
                onClick={() => {
                  setIsQuestionModalOpen(false);
                  setQuestionContent('');
                  setMessageError('');
                }}
                className="cancel-btn"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevisList;
