import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
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
  const { currentUser } = useAuth();

  const fetchDevis = useCallback(async () => {
    try {
      let devisQuery;
      
      if (userType === 'particulier') {
        devisQuery = query(
          collection(db, 'devis'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
      } else if (userType === 'professionnel') {
        devisQuery = query(
          collection(db, 'devis'),
          where('status', '==', 'en_attente'),
          orderBy('createdAt', 'desc')
        );
      } else if (userType === 'admin') {
        devisQuery = query(
          collection(db, 'devis'),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(devisQuery);
      const devisList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let formattedDate;
        
        if (data.createdAt && data.createdAt.toDate) {
          try {
            formattedDate = data.createdAt.toDate().toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch (error) {
            console.error('Error formatting date:', error);
            formattedDate = 'Date invalide';
          }
        } else {
          formattedDate = 'Date non disponible';
        }

        return {
          id: doc.id,
          ...data,
          createdAt: formattedDate
        };
      });

      setDevis(devisList);
      setError('');
    } catch (err) {
      console.error('Erreur lors de la récupération des devis:', err);
      setError('Une erreur est survenue lors du chargement des devis.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, userType]);

  useEffect(() => {
    if (currentUser && userType) {
      fetchDevis();
    }
  }, [currentUser, userType, fetchDevis]);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'attente_reponse':
        return 'En attente de réponse';
      case 'devis_envoye':
        return 'Devis envoyé';
      case 'accepte':
        return 'Accepté';
      case 'refuse':
        return 'Refusé';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'en_attente':
        return 'status en_attente';
      case 'attente_reponse':
        return 'status attente_reponse';
      case 'devis_envoye':
        return 'status devis_envoye';
      case 'accepte':
        return 'status accepte';
      case 'refuse':
        return 'status refuse';
      default:
        return 'status';
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
        createdAt: Timestamp.now(),
        read: false,
        type: 'devis_question',
        participants: [currentUser.uid, selectedDevis.userId]
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Mettre à jour le statut du devis
      await updateDoc(doc(db, 'devis', selectedDevis.id), {
        status: 'attente_reponse',
        lastUpdated: Timestamp.now()
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
        createdAt: Timestamp.now()
      };

      // Enregistrer le devis dans Firestore
      await addDoc(collection(db, 'devis_reponses'), devisData);

      // Mettre à jour le statut du devis original
      await updateDoc(doc(db, 'devis', selectedDevis.id), {
        status: 'devis_envoye',
        lastUpdated: Timestamp.now()
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

  if (loading) {
    return <div className="loading">Chargement des devis...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="devis-list">
      <h2>Vos devis</h2>
      {devis.length === 0 ? (
        <div className="no-devis">
          {userType === 'particulier' 
            ? "Vous n'avez pas encore reçu de devis. Une fois votre demande traitée, les devis apparaîtront ici." 
            : "Aucun devis pour le moment"}
        </div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type de projet</th>
                <th>Surface</th>
                <th>Ville</th>
                <th>Status</th>
                {userType !== 'particulier' && <th>Contact</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devis.map((devis) => (
                <tr key={devis.id}>
                  <td>{devis.createdAt}</td>
                  <td>{devis.typeProjet}</td>
                  <td>{devis.surface} m²</td>
                  <td>{devis.ville}</td>
                  <td>
                    <span className={getStatusClass(devis.status)}>
                      {getStatusLabel(devis.status)}
                    </span>
                  </td>
                  {userType !== 'particulier' && (
                    <td>{devis.userEmail}</td>
                  )}
                  <td>
                    <button 
                      className="action-button"
                      onClick={() => setSelectedDevis(devis)}
                    >
                      Voir détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {renderModalContent()}
          {renderFullscreenImage()}
        </>
      )}
    </div>
  );
};

export default DevisList;
