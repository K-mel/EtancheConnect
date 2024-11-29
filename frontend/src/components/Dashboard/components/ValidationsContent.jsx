import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../contexts/AuthContext';
import '../styles/validations.css';

export default function ValidationsContent() {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDevis, setSelectedDevis] = useState(null);
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
      await updateDoc(doc(db, 'devis', devisId), {
        status: 'valide',
        validatedAt: serverTimestamp(),
        validatedBy: currentUser.uid
      });
      
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
    </div>
  );
}
