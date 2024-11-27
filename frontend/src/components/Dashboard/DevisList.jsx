import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validateMessageContent, sanitizeMessageContent } from '../../utils/messageValidation';
import './DevisList.css';

const DevisList = ({ userType }) => {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [messageError, setMessageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devisAmount, setDevisAmount] = useState('');
  const [devisDetails, setDevisDetails] = useState('');
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
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
      setIsSubmitting(true);
      setMessageError('');

      // Valider le montant et les détails
      if (!devisAmount || isNaN(devisAmount)) {
        setMessageError('Veuillez entrer un montant valide.');
        return;
      }

      const validation = validateMessageContent(devisDetails);
      if (!validation.isValid) {
        setMessageError(validation.error);
        return;
      }

      // Mettre à jour le devis
      await updateDoc(doc(db, 'devis', selectedDevis.id), {
        status: 'devis_envoye',
        montant: Number(devisAmount),
        details: sanitizeMessageContent(devisDetails),
        lastUpdated: Timestamp.now(),
        professionalId: currentUser.uid
      });

      // Créer un message de notification
      const messageData = {
        senderId: currentUser.uid,
        recipientId: selectedDevis.userId,
        content: 'Un nouveau devis a été envoyé pour votre demande.',
        devisId: selectedDevis.id,
        createdAt: Timestamp.now(),
        read: false,
        type: 'devis_envoye',
        participants: [currentUser.uid, selectedDevis.userId]
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Réinitialiser et fermer le modal
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
      <div className="modal-overlay" onClick={() => setSelectedDevis(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Détails du devis</h3>
            <button className="close-button" onClick={() => setSelectedDevis(null)}>&times;</button>
          </div>
          
          <div className="modal-body">
            {/* Informations du devis */}
            <div className="devis-details">
              <div className="detail-row">
                <strong>Date:</strong>
                <span>{selectedDevis.createdAt}</span>
              </div>
              <div className="detail-row">
                <strong>Type de projet:</strong>
                <span>{selectedDevis.typeProjet}</span>
              </div>
              <div className="detail-row">
                <strong>Surface:</strong>
                <span>{selectedDevis.surface} m²</span>
              </div>
              <div className="detail-row">
                <strong>Description:</strong>
                <p>{selectedDevis.description}</p>
              </div>
              <div className="detail-row">
                <strong>Ville:</strong>
                <span>{selectedDevis.ville}</span>
              </div>
            </div>

            {/* Actions pour les professionnels */}
            {userType === 'professionnel' && (
              <div className="devis-actions">
                <div className="action-buttons">
                  <button
                    className="action-button send-devis"
                    onClick={() => setShowDevisForm(true)}
                  >
                    Envoyer un devis
                  </button>
                  <button
                    className="action-button send-message"
                    onClick={() => setShowMessageForm(true)}
                  >
                    Demander plus d'informations
                  </button>
                </div>

                {/* Formulaire de devis */}
                {showDevisForm && (
                  <div className="devis-form">
                    <h4>Envoyer un devis</h4>
                    <div className="form-group">
                      <label>Montant (€)</label>
                      <input
                        type="number"
                        value={devisAmount}
                        onChange={(e) => setDevisAmount(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Détails du devis</label>
                      <textarea
                        value={devisDetails}
                        onChange={(e) => setDevisDetails(e.target.value)}
                        placeholder="Détaillez votre devis..."
                        rows="4"
                      />
                    </div>
                    {messageError && <div className="error-message">{messageError}</div>}
                    <button
                      className="submit-button"
                      onClick={handleSendDevis}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Envoi en cours...' : 'Envoyer le devis'}
                    </button>
                  </div>
                )}

                {/* Formulaire de message */}
                {showMessageForm && (
                  <div className="message-form">
                    <h4>Demander plus d'informations</h4>
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Posez vos questions..."
                      rows="4"
                    />
                    {messageError && <div className="error-message">{messageError}</div>}
                    <button
                      className="submit-button"
                      onClick={handleSendMessage}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
        <p>Aucun devis trouvé.</p>
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
        </>
      )}
    </div>
  );
};

export default DevisList;
