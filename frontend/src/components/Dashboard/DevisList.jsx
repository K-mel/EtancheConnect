import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validateMessageContent, sanitizeMessageContent } from '../../utils/messageValidation';
import './styles/devis.css';

const DevisList = ({ userType }) => {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [messageError, setMessageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [devisAmount, setDevisAmount] = useState('');
  const [devisDetails, setDevisDetails] = useState('');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionContent, setQuestionContent] = useState('');
  const { currentUser } = useAuth();

  const fetchDevis = useCallback(async () => {
    setLoading(true);
    try {
      let q;
      
      switch (userType) {
        case 'particulier':
          // Les particuliers voient tous leurs devis
          q = query(
            collection(db, 'devis'),
            where('userId', '==', currentUser.uid)
          );
          break;
        
        case 'professionnel':
          // Les professionnels ne voient que les devis validés par l'admin
          q = query(
            collection(db, 'devis'),
            where('status', '==', 'valide')
          );
          break;
        
        case 'administrateur':
          // L'admin voit tous les devis en attente de validation
          q = query(collection(db, 'devis'));
          break;
        
        default:
          throw new Error('Type d\'utilisateur non reconnu');
      }

      const querySnapshot = await getDocs(q);
      const devisData = querySnapshot.docs.map(doc => ({

        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleDateString() || 'Date inconnue'
      }));

      // Trier les devis par date de création (du plus récent au plus ancien)
      setDevis(devisData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error('Erreur lors de la récupération des devis:', error);
      setError('Une erreur est survenue lors du chargement des devis.');
    } finally {
      setLoading(false);
    }
  }, [userType, currentUser]);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'en_attente':
        return 'En attente de validation';
      case 'valide':
        return 'Validé';
      case 'refuse':
        return 'Refusé';
      case 'devis_envoye':
        return 'Devis envoyé';
      case 'accepte':
        return 'Accepté';
      default:
        return status;
    }
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
    if (!questionContent.trim()) {
      setMessageError('Veuillez entrer votre question');
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
        participants: [currentUser.uid, particulierId]
      };

      await addDoc(collection(db, 'messages'), messageData);

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

  // Rendu des actions selon le rôle
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
      <button 
        className="action-button"
        onClick={() => setSelectedDevis(devis)}
      >
        Voir détails
      </button>
    );
  };

  const renderModalContent = () => {
    if (!selectedDevis) return null;

    return (
      <div className="devis-modal" onClick={() => setSelectedDevis(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Détails du devis</h3>
            <button className="close-button" onClick={() => setSelectedDevis(null)}>&times;</button>
          </div>
          <div className="devis-details">
            <p><strong>Date:</strong> {selectedDevis.createdAt}</p>
            <p><strong>Type de projet:</strong> {selectedDevis.typeProjet}</p>
            <p><strong>Surface:</strong> {selectedDevis.surface} m²</p>
            <p><strong>Ville:</strong> {selectedDevis.ville}</p>
            <p><strong>Status:</strong> {getStatusLabel(selectedDevis.status)}</p>
            <p><strong>Description:</strong> {selectedDevis.description || 'Aucune description'}</p>
            
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
          
          {userType === 'professionnel' && selectedDevis.status === 'en_attente' && (
            <div className="message-form">
              <h4>Envoyer un message</h4>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Écrivez votre message ici..."
              />
              {messageError && <p className="error-message">{messageError}</p>}
              <button
                onClick={handleSendMessage}
                disabled={isSubmitting || !messageContent.trim()}
              >
                Envoyer
              </button>
            </div>
          )}
          {userType === 'professionnel' && selectedDevis.status === 'en_attente' && (
            <div className="devis-form">
              <h4>Envoyer un devis</h4>
              <input
                type="number"
                value={devisAmount}
                onChange={(e) => setDevisAmount(e.target.value)}
                placeholder="Montant du devis"
              />
              <textarea
                value={devisDetails}
                onChange={(e) => setDevisDetails(e.target.value)}
                placeholder="Détails du devis"
              />
              {messageError && <p className="error-message">{messageError}</p>}
              <button
                onClick={handleSendDevis}
                disabled={isSubmitting || !devisAmount || !devisDetails.trim()}
              >
                Envoyer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFullscreenImage = () => {
    if (!selectedImage) return null;

    return (
      <div 
        className="fullscreen-image-modal" 
        onClick={() => setSelectedImage(null)}
      >
        <img 
          src={selectedImage} 
          alt="Vue agrandie" 
          className="fullscreen-image"
          onClick={e => e.stopPropagation()}
        />
      </div>
    );
  };

  useEffect(() => {
    if (currentUser && userType) {
      fetchDevis();
    }
  }, [currentUser, userType, fetchDevis]);

  return (
    <div className="devis-list">
      <h2>
        {userType === 'particulier' ? 'Mes devis' : 
         userType === 'professionnel' ? 'Devis disponibles' : 
         'Validation des devis'}
      </h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Chargement des devis...</div>
      ) : devis.length === 0 ? (
        <div className="no-devis">
          {userType === 'particulier' 
            ? "Vous n'avez pas encore de devis. Une fois votre demande traitée, les devis apparaîtront ici."
            : userType === 'professionnel'
            ? "Aucun devis n'est disponible pour le moment. Les devis apparaîtront ici une fois validés par l'administrateur."
            : "Aucun devis en attente de validation."}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type de projet</th>
              <th>Surface</th>
              <th>Ville</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devis.map((devis) => (
              <tr key={devis.id} className={devis.status}>
                <td>{devis.createdAt}</td>
                <td>{devis.typeProjet}</td>
                <td>{devis.surface} m²</td>
                <td>{devis.ville}</td>
                <td>
                  <span className={`status ${devis.status}`}>
                    {getStatusLabel(devis.status)}
                  </span>
                </td>
                <td className="actions">
                  {renderActions(devis)}
                  {userType === 'professionnel' && (
                    <button
                      onClick={() => {
                        setSelectedDevis(devis);
                        setIsQuestionModalOpen(true);
                      }}
                      className="question-btn"
                    >
                      Question
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
