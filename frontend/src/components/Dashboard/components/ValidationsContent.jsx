import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { FaCheck, FaTimes, FaEye, FaSpinner } from 'react-icons/fa';
import '../styles/validations.css';

const ValidationsContent = () => {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedValidation, setSelectedValidation] = useState(null);

  useEffect(() => {
    fetchValidations();
  }, []);

  const fetchValidations = async () => {
    try {
      setLoading(true);
      const validationsRef = collection(db, 'validations');
      const q = query(validationsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const validationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt ? new Date(doc.data().createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'
      }));
      
      setValidations(validationsData);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des validations:', err);
      setError('Une erreur est survenue lors du chargement des validations.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (validationId, action) => {
    try {
      const validationRef = doc(db, 'validations', validationId);
      const validation = validations.find(v => v.id === validationId);
      
      if (!validation) {
        throw new Error('Validation non trouvée');
      }

      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        updatedAt: new Date().toISOString(),
        processedBy: auth.currentUser?.uid || 'unknown'
      };

      await updateDoc(validationRef, updateData);

      // Si c'est une validation de devis, mettre à jour le statut du devis
      if (validation.type === 'devis') {
        const devisRef = doc(db, 'devis', validation.devisId);
        await updateDoc(devisRef, {
          status: action === 'approve' ? 'approved' : 'rejected',
          updatedAt: new Date().toISOString()
        });
      }

      // Rafraîchir la liste des validations
      await fetchValidations();
    } catch (err) {
      console.error('Erreur lors de la validation:', err);
      setError('Une erreur est survenue lors de la validation.');
    }
  };

  const handleViewValidation = (validationId) => {
    const validation = validations.find(v => v.id === validationId);
    setSelectedValidation(validation);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Chargement des validations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={fetchValidations}>Réessayer</button>
      </div>
    );
  }

  return (
    <div className="validations-content">
      <h2>Validations en Attente</h2>
      
      {selectedValidation ? (
        <div className="validation-details">
          <h3>Détails de la Validation</h3>
          <div className="validation-details-content">
            <p><strong>Type:</strong> {selectedValidation.type}</p>
            <p><strong>Date:</strong> {selectedValidation.date}</p>
            <p><strong>Statut:</strong> {selectedValidation.status}</p>
            {selectedValidation.devisId && (
              <p><strong>ID Devis:</strong> {selectedValidation.devisId}</p>
            )}
            {selectedValidation.description && (
              <p><strong>Description:</strong> {selectedValidation.description}</p>
            )}
            {selectedValidation.amount && (
              <p><strong>Montant:</strong> {selectedValidation.amount}€</p>
            )}
          </div>
          <div className="validation-details-actions">
            <button 
              onClick={() => handleValidation(selectedValidation.id, 'approve')}
              className="action-button approve"
            >
              Approuver
            </button>
            <button 
              onClick={() => handleValidation(selectedValidation.id, 'reject')}
              className="action-button reject"
            >
              Rejeter
            </button>
            <button 
              onClick={() => setSelectedValidation(null)}
              className="action-button back"
            >
              Retour
            </button>
          </div>
        </div>
      ) : (
        <div className="validations-list">
          {validations.length === 0 ? (
            <p className="no-validations">Aucune validation en attente</p>
          ) : (
            validations.map((validation) => (
              <div key={validation.id} className="validation-item">
                <div className="validation-info">
                  <span className="validation-type">{validation.type}</span>
                  <span className="validation-date">{validation.date}</span>
                  <span className={`validation-status ${validation.status}`}>
                    {validation.status}
                  </span>
                </div>
                <div className="validation-actions">
                  <button 
                    onClick={() => handleValidation(validation.id, 'approve')}
                    className="action-button approve"
                    title="Approuver"
                  >
                    <FaCheck />
                  </button>
                  <button 
                    onClick={() => handleValidation(validation.id, 'reject')}
                    className="action-button reject"
                    title="Rejeter"
                  >
                    <FaTimes />
                  </button>
                  <button 
                    onClick={() => handleViewValidation(validation.id)}
                    className="action-button view"
                    title="Voir les détails"
                  >
                    <FaEye />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationsContent;
