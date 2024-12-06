import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import QuoteDetailsModal from './QuoteDetailsModal';
import PrintableQuote from './PrintableQuote';
import { FaPrint } from 'react-icons/fa';
import './MesDevisContent.css';

const MesDevisContent = () => {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchDevis = async () => {
      try {
        const q = query(
          collection(db, 'professionalQuotes'),
          where('professionalId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const devisData = await Promise.all(querySnapshot.docs.map(async doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          
          // Fetch professional data
          const professionalDoc = await getDocs(query(
            collection(db, 'professionals'),
            where('userId', '==', currentUser.uid)
          ));

          let professionalData = null;
          if (!professionalDoc.empty) {
            professionalData = professionalDoc.docs[0].data();
          }

          return {
            id: doc.id,
            ...data,
            date: createdAt,
            professional: professionalData
          };
        }));
        
        setDevis(devisData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des devis:', error);
        setLoading(false);
      }
    };

    fetchDevis();
  }, [currentUser]);

  const handleOpenDetails = (devis) => {
    setSelectedDevis(devis);
    setIsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedDevis(null);
    setIsModalOpen(false);
  };

  const handlePrint = (devis) => {
    setSelectedDevis(devis);
    setShowPrintPreview(true);
  };

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
    setSelectedDevis(null);
  };

  if (loading) {
    return <div className="loading">Chargement des devis...</div>;
  }

  if (devis.length === 0) {
    return <div className="empty-state">Vous n'avez pas encore envoyé de devis.</div>;
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'en_attente_validation':
        return 'En attente validation';
      case 'accepte':
        return 'Accepté';
      case 'refuse':
        return 'Refusé';
      default:
        return 'En attente validation';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'en_attente_validation':
        return 'status-badge pending';
      case 'accepte':
        return 'status-badge accepted';
      case 'refuse':
        return 'status-badge rejected';
      default:
        return 'status-badge pending';
    }
  };

  return (
    <div className="mes-devis-content">
      <div className="devis-grid">
        {devis.map((devis) => (
          <div key={devis.id} className="professional-quote">
            <div className="professional-quote-header">
              <span className="quote-reference">Devis #{devis.id.slice(0, 8)}</span>
              <span className={getStatusClass(devis.status)}>
                {getStatusLabel(devis.status)}
              </span>
            </div>
            <div className="quote-date">
              <span className="date-label">Date d'envoi :</span>
              {devis.date.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>

            <div className="quote-details">
              <div className="quote-section">
                <h4>Client</h4>
                <p><strong>Nom:</strong> {devis.clientName}</p>
                <p><strong>Email:</strong> {devis.clientEmail}</p>
                <p><strong>Téléphone:</strong> {devis.clientPhone}</p>
              </div>

              <div className="quote-section">
                <h4>Travaux</h4>
                <p><strong>Type:</strong> {devis.workType}</p>
                <p><strong>Surface:</strong> {devis.surfaceArea} m²</p>
                <p><strong>Description:</strong> {devis.workDescription}</p>
              </div>

              <div className="quote-section">
                <h4>Montants</h4>
                <div className="quote-totals">
                  <div className="total-row">
                    <span className="total-label">Total HT</span>
                    <span className="total-amount">{devis.subtotalHT.toFixed(2)}€</span>
                  </div>
                  <div className="total-row">
                    <span className="total-label">TVA (10%)</span>
                    <span className="total-amount">{devis.tva.toFixed(2)}€</span>
                  </div>
                  <div className="total-row">
                    <span className="total-label">Total TTC</span>
                    <span className="total-amount final">{devis.totalTTC.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="quote-actions">
              <button 
                className="quote-action-button primary"
                onClick={() => handleOpenDetails(devis)}
              >
                Voir détails
              </button>
              <button 
                className="quote-action-button secondary"
                onClick={() => handlePrint(devis)}
              >
                <FaPrint /> Imprimer
              </button>
              <button className="quote-action-button secondary">Contacter le client</button>
            </div>
          </div>
        ))}
      </div>

      {selectedDevis && (
        <QuoteDetailsModal 
          quote={selectedDevis} 
          isOpen={isModalOpen}
          onClose={handleCloseDetails}
        />
      )}
      {showPrintPreview && selectedDevis && (
        <PrintableQuote 
          devis={selectedDevis} 
          onClose={handleClosePrintPreview}
        />
      )}
    </div>
  );
};

export default MesDevisContent;
