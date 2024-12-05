import React from 'react';
import './QuoteDetailsModal.css';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatDevisNumber } from '../../../utils/formatters';

const QuoteDetailsModal = ({ quote, isOpen, onClose }) => {
  if (!isOpen || !quote) return null;

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

  const formatDate = (date) => {
    if (!date) return 'Date non disponible';
    return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Détails du Devis</h2>
          <div className="references">
            <p>Référence devis: {quote.id?.substring(0, 8)}</p>
            <p>Demande de devis: {formatDevisNumber(quote.devisId)}</p>
          </div>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="quote-section">
          <h3 className="section-title">Informations Générales</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Professionnel</span>
              <span className="info-value">{quote.professionalName || 'Non spécifié'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Date de création</span>
              <span className="info-value">{formatDate(quote.date)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Type de travaux</span>
              <span className="info-value">{quote.workType || 'Non spécifié'}</span>
            </div>
          </div>
        </div>

        <div className="quote-section">
          <h3 className="section-title">Description des Travaux</h3>
          <div className="description-box">
            <p className="description-text">
              {quote.workDescription || 'Aucune description disponible'}
            </p>
          </div>
        </div>

        <div className="quote-section">
          <h3 className="section-title">Informations Client</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Nom</span>
              <span className="info-value">{quote.clientName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{quote.clientEmail}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Téléphone</span>
              <span className="info-value">{quote.clientPhone || 'Non spécifié'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Adresse</span>
              <span className="info-value">{quote.clientAddress || 'Non spécifiée'}</span>
            </div>
          </div>
        </div>

        <div className="quote-section">
          <h3 className="section-title">Détails Financiers</h3>
          <div className="total-section">
            <div className="total-grid">
              <div className="total-item">
                <span className="total-label">Total HT</span>
                <span className="total-value">{formatPrice(quote.totalHT)}</span>
              </div>
              <div className="total-item">
                <span className="total-label">TVA</span>
                <span className="total-value">{formatPrice(quote.totalTVA)}</span>
              </div>
              <div className="total-item">
                <span className="total-label">Total TTC</span>
                <span className="total-value total-ttc">{formatPrice(quote.totalTTC)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="status-section">
          <h3 className="section-title">Statut du Devis</h3>
          <div className={`status-badge ${quote.status}`}>
            {getDisplayStatus(quote.status)}
          </div>
        </div>

        <div className="actions">
          <button className="action-button secondary-button" onClick={onClose}>
            Fermer
          </button>
          {quote.status === 'en_attente_signature' && (
            <button className="action-button primary-button">
              Signer le devis
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailsModal;
