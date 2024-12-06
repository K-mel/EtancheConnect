import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../contexts/AuthContext';
import './QuoteDetails.css';

const QuoteDetails = () => {
  const { devisId } = useParams();
  const [searchParams] = useSearchParams();
  const sourceCollection = searchParams.get('source') || 'devis';
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuoteDetails = async () => {
      if (!devisId || !currentUser) {
        setError("Informations manquantes");
        setLoading(false);
        return;
      }

      try {
        // Récupérer le devis depuis la collection spécifiée
        const quoteDoc = await getDoc(doc(db, sourceCollection, devisId));

        if (!quoteDoc.exists()) {
          setError("Devis non trouvé");
          setLoading(false);
          return;
        }

        const quoteData = {
          id: quoteDoc.id,
          ...quoteDoc.data()
        };

        // Vérifier les autorisations
        if (quoteData.professionalId !== currentUser.uid && 
            quoteData.userId !== currentUser.uid) {
          setError("Vous n'avez pas l'autorisation de voir ce devis");
          setLoading(false);
          return;
        }

        setQuote(quoteData);
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors de la récupération du devis:", err);
        setError("Erreur lors du chargement du devis");
        setLoading(false);
      }
    };

    fetchQuoteDetails();
  }, [devisId, currentUser, sourceCollection]);

  if (loading) {
    return (
      <div className="quote-details-container loading">
        <div className="spinner"></div>
        <p>Chargement des détails du devis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quote-details-container error">
        <p className="error-message">{error}</p>
        <button onClick={() => navigate(-1)} className="back-button">
          Retour
        </button>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="quote-details-container">
        <p>Aucun détail trouvé pour ce devis</p>
        <button onClick={() => navigate(-1)} className="back-button">
          Retour
        </button>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="quote-details-container">
      <div className="quote-header">
        <h2>Détails du Devis</h2>
        <span className={`status-badge status-${quote.status}`}>
          {quote.status}
        </span>
      </div>

      <div className="quote-info-grid">
        <div className="info-group">
          <h3>Informations Générales</h3>
          <p><strong>Type de projet:</strong> {quote.typeProjet}</p>
          <p><strong>Ville:</strong> {quote.ville}</p>
          <p><strong>Date de création:</strong> {formatDate(quote.createdAt)}</p>
        </div>

        <div className="info-group">
          <h3>Détails du Projet</h3>
          <p><strong>Surface:</strong> {quote.surface} m²</p>
          <p><strong>Budget:</strong> {quote.budget} €</p>
          {quote.description && (
            <p><strong>Description:</strong> {quote.description}</p>
          )}
        </div>

        {quote.details && (
          <div className="info-group">
            <h3>Spécifications</h3>
            {Object.entries(quote.details).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {value}</p>
            ))}
          </div>
        )}
      </div>

      <div className="quote-actions">
        <button onClick={() => navigate(-1)} className="back-button">
          Retour
        </button>
      </div>
    </div>
  );
};

export default QuoteDetails;
