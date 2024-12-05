import React from 'react';
import './QuoteDetailsModal.css';

const QuoteDetailsModal = ({ devis, onClose }) => {
  if (!devis) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Détails du devis #{devis.id.slice(0, 8)}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h3>Informations Client</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Nom</label>
                <p>{devis.clientName}</p>
              </div>
              <div className="detail-item">
                <label>Email</label>
                <p>{devis.clientEmail}</p>
              </div>
              <div className="detail-item">
                <label>Téléphone</label>
                <p>{devis.clientPhone}</p>
              </div>
              <div className="detail-item">
                <label>Adresse</label>
                <p>{devis.clientAddress}</p>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Détails des Travaux</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Type de travaux</label>
                <p>{devis.workType}</p>
              </div>
              <div className="detail-item">
                <label>Surface</label>
                <p>{devis.surfaceArea} m²</p>
              </div>
              <div className="detail-item full-width">
                <label>Description</label>
                <p>{devis.workDescription}</p>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Détails Financiers</h3>
            <div className="financial-details">
              <div className="financial-row">
                <span>Total HT</span>
                <span>{devis.subtotalHT.toFixed(2)}€</span>
              </div>
              <div className="financial-row">
                <span>TVA (10%)</span>
                <span>{devis.tva.toFixed(2)}€</span>
              </div>
              <div className="financial-row total">
                <span>Total TTC</span>
                <span>{devis.totalTTC.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Statut et Dates</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Statut actuel</label>
                <p className={`status ${devis.status}`}>
                  {devis.status === 'en_attente_validation' ? 'En attente validation' :
                   devis.status === 'accepte' ? 'Accepté' : 
                   devis.status === 'refuse' ? 'Refusé' : 
                   'En attente validation'}
                </p>
              </div>
              <div className="detail-item">
                <label>Date d'envoi</label>
                <p>
                  {devis.date instanceof Date ? devis.date.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) : 'Non spécifiée'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-button secondary" onClick={onClose}>Fermer</button>
          <button className="modal-button primary">Contacter le client</button>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailsModal;
