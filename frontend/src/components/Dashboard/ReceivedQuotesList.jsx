import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import './ReceivedQuotesList.css';
import QuoteDetailsModal from './components/QuoteDetailsModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FaEye } from 'react-icons/fa';
import { formatDevisNumber } from '../../utils/formatters';

const ReceivedQuotesList = () => {
  const [receivedQuotes, setReceivedQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!currentUser) return;
      
      try {
        const quotesQuery = query(
          collection(db, 'professionalQuotes'),
          where('clientEmail', '==', currentUser.email)
        );
        
        const querySnapshot = await getDocs(quotesQuery);
        const quotes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate(),
        }));
        
        const sortedQuotes = quotes.sort((a, b) => b.date - a.date);
        setReceivedQuotes(sortedQuotes);
      } catch (error) {
        console.error('Erreur lors de la récupération des devis:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [currentUser]);

  const handleOpenModal = (quote) => {
    setSelectedQuote(quote);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedQuote(null);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price || 0);
  };

  const getDisplayStatus = (status) => {
    const statusMap = {
      'en_attente_signature': 'En attente de signature',
      'en_attente_validation': 'En attente de validation',
      'en_attente_paiement': 'En attente de paiement',
      'en_attente_travaux': 'En attente des travaux',
      'accepte': 'Accepté',
      'refuse': 'Refusé'
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return <div className="loading">Chargement des devis...</div>;
  }

  return (
    <div className="received-quotes-container">
      <h2>Mes Devis Reçus</h2>
      {receivedQuotes.length === 0 ? (
        <div className="no-quotes">
          Vous n'avez pas encore reçu de devis.
        </div>
      ) : (
        <div className="quotes-grid">
          {receivedQuotes.map((quote) => (
            <div key={quote.id} className="quote-card">
              <div className="quote-header">
                <div>
                  <div className="quote-company">{quote.professionalName || 'Professionnel'}</div>
                  <div className="quote-date">
                    {quote.date ? format(quote.date, 'dd MMMM yyyy', { locale: fr }) : 'Date non disponible'}
                  </div>
                </div>
                <div className={`status-badge ${quote.status}`}>
                  {getDisplayStatus(quote.status)}
                </div>
              </div>
              
              <div className="quote-details">
                <div className="quote-info-grid">
                  <div className="quote-info-item">
                    <span className="quote-info-label">Type de travaux</span>
                    <span className="quote-info-value">{quote.workType || 'Non spécifié'}</span>
                  </div>
                  <div className="quote-info-item">
                    <span className="quote-info-label">Référence devis</span>
                    <span className="quote-info-value">{quote.id?.substring(0, 8) || 'N/A'}</span>
                  </div>
                  <div className="quote-info-item">
                    <span className="quote-info-label">Demande de devis</span>
                    <span className="quote-info-value">{formatDevisNumber(quote.devisId) || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="quote-description">
                  {quote.workDescription?.substring(0, 100)}
                  {quote.workDescription?.length > 100 ? '...' : ''}
                </div>
                
                <div className="quote-price">
                  <span className="price-label">Total TTC</span>
                  <span className="price-value">{formatPrice(quote.totalTTC)}</span>
                </div>

                <button 
                  className="view-details-button"
                  onClick={() => handleOpenModal(quote)}
                >
                  <FaEye /> Voir les détails
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <QuoteDetailsModal
        quote={selectedQuote}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default ReceivedQuotesList;
