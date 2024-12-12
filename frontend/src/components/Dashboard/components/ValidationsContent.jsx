import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { createQuoteRequestValidatedNotification, notifyProfessionalsNewQuoteRequest } from '../../../services/notificationService';
import '../styles/validations.css';

export default function ValidationsContent() {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchDevisEnAttente();
  }, []);

  const fetchDevisEnAttente = async () => {
    try {
      const q = query(
        collection(db, 'devis'),
        where('status', '==', 'en_attente')
      );
      
      const querySnapshot = await getDocs(q);
      const devisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleDateString() || 'Date inconnue'
      }));

      setDevis(devisData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setError('');
    } catch (error) {
      console.error('Erreur lors de la récupération des devis:', error);
      setError('Une erreur est survenue lors du chargement des devis.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateDevis = async (devisId) => {
    try {
      const devisRef = doc(db, 'devis', devisId);
      await updateDoc(devisRef, {
        status: 'valide',
        validatedAt: serverTimestamp(),
        validatedBy: currentUser.uid
      });

      // Récupérer les données du devis pour les notifications
      const devisDoc = devis.find(d => d.id === devisId);
      if (devisDoc) {
        // Créer une notification pour le particulier
        await createQuoteRequestValidatedNotification(devisDoc);
        
        // Notifier tous les professionnels
        await notifyProfessionalsNewQuoteRequest(devisDoc);
      }
      
      // Rafraîchir la liste des devis
      fetchDevisEnAttente();
      setSelectedDevis(null);
    } catch (error) {
      console.error('Erreur lors de la validation du devis:', error);
      setError('Une erreur est survenue lors de la validation du devis.');
    }
  };

  const handleRefuseDevis = async (devisId) => {
    try {
      await updateDoc(doc(db, 'devis', devisId), {
        status: 'refuse',
        refusedAt: serverTimestamp(),
        refusedBy: currentUser.uid
      });
      
      // Rafraîchir la liste des devis
      fetchDevisEnAttente();
      setSelectedDevis(null);
    } catch (error) {
      console.error('Erreur lors du refus du devis:', error);
      setError('Une erreur est survenue lors du refus du devis.');
    }
  };

  const validateQuestion = (text) => {
    // Regex pour détecter les numéros de téléphone (formats français)
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;
    
    // Regex pour détecter les emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    
    // Regex pour détecter les URLs
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/;

    if (phoneRegex.test(text)) {
      return "Les numéros de téléphone ne sont pas autorisés dans les questions.";
    }
    
    if (emailRegex.test(text)) {
      return "Les adresses email ne sont pas autorisées dans les questions.";
    }
    
    if (urlRegex.test(text)) {
      return "Les liens URL ne sont pas autorisés dans les questions.";
    }

    return "";
  };

  const handleQuestionChange = (e) => {
    const text = e.target.value;
    setQuestionText(text);
    const error = validateQuestion(text);
    setQuestionError(error);
  };

  const handleQuestionSubmit = async () => {
    const error = validateQuestion(questionText);
    if (error) {
      setQuestionError(error);
      return;
    }

    // Votre logique existante pour envoyer la question
    // ...
  };

  const handleAskQuestion = () => {
    setIsQuestionModalOpen(true);
    setQuestionText('');
    setQuestionError('');
  };

  const handleCloseQuestionModal = () => {
    setIsQuestionModalOpen(false);
    setQuestionText('');
    setQuestionError('');
  };

  const renderDevisDetails = () => {
    if (!selectedDevis) return null;

    return (
      <div className="devis-modal">
        <div className="devis-modal-content">
          <h3>Détails de la demande de devis</h3>
          
          <div className="devis-details">
            <div className="detail-group">
              <label>Date de création:</label>
              <span>{selectedDevis.createdAt}</span>
            </div>
            
            <div className="detail-group">
              <label>Type de projet:</label>
              <span>{selectedDevis.typeProjet}</span>
            </div>
            
            <div className="detail-group">
              <label>Surface:</label>
              <span>{selectedDevis.surface} m²</span>
            </div>
            
            <div className="detail-group">
              <label>Ville:</label>
              <span>{selectedDevis.ville}</span>
            </div>
            
            <div className="detail-group">
              <label>Description:</label>
              <p>{selectedDevis.description}</p>
            </div>

            {selectedDevis.photos && selectedDevis.photos.length > 0 && (
              <div className="detail-group">
                <label>Photos:</label>
                <div className="photos-grid">
                  {selectedDevis.photos.map((photo, index) => (
                    <img 
                      key={index}
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="devis-photo"
                      onClick={() => setSelectedImage(photo)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button 
              className="validate-button"
              onClick={() => handleValidateDevis(selectedDevis.id)}
            >
              Valider
            </button>
            <button 
              className="refuse-button"
              onClick={() => handleRefuseDevis(selectedDevis.id)}
            >
              Refuser
            </button>
            <button 
              className="close-button"
              onClick={() => setSelectedDevis(null)}
            >
              Fermer
            </button>
            <button 
              className="ask-question-button"
              onClick={handleAskQuestion}
            >
              Poser une question
            </button>
          </div>
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

  const renderQuestionModal = () => {
    if (!isQuestionModalOpen) return null;

    return (
      <div className="modal-overlay" onClick={handleCloseQuestionModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h3>Poser une question sur le devis</h3>
          
          <div className="question-info">
            <p>Pour votre sécurité, ne sont pas autorisés dans les questions :</p>
            <ul>
              <li>Numéros de téléphone</li>
              <li>Adresses email</li>
              <li>Liens URL</li>
            </ul>
          </div>

          <textarea 
            placeholder="Écrivez votre question ici..." 
            className="question-textarea"
            value={questionText}
            onChange={handleQuestionChange}
          ></textarea>

          {questionError && (
            <div className="error-message">
              {questionError}
            </div>
          )}

          <div className="modal-actions">
            <button 
              className="submit-btn" 
              onClick={handleQuestionSubmit}
              disabled={!!questionError || !questionText.trim()}
            >
              Envoyer
            </button>
            <button 
              className="cancel-btn"
              onClick={handleCloseQuestionModal}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Chargement des demandes de devis...</div>;
  }

  return (
    <div className="validations-content">
      <h2>Validation des demandes de devis</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {devis.length === 0 ? (
        <div className="no-devis">
          Aucune demande de devis en attente de validation.
        </div>
      ) : (
        <div className="devis-grid">
          {devis.map((devis) => (
            <div key={devis.id} className="devis-card">
              <div className="devis-header">
                <span className="devis-date">{devis.createdAt}</span>
                <span className="devis-type">{devis.typeProjet}</span>
              </div>
              
              <div className="devis-body">
                <div className="devis-info">
                  <span>Surface: {devis.surface} m²</span>
                  <span>Ville: {devis.ville}</span>
                </div>
                
                <p className="devis-description">
                  {devis.description?.substring(0, 100)}
                  {devis.description?.length > 100 ? '...' : ''}
                </p>
              </div>
              
              <div className="devis-actions">
                <button 
                  className="view-button"
                  onClick={() => setSelectedDevis(devis)}
                >
                  Voir les détails
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {renderDevisDetails()}
      {renderFullscreenImage()}
      {renderQuestionModal()}
    </div>
  );
}
