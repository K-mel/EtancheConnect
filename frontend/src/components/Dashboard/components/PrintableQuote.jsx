import React, { useState, useEffect } from 'react';
import { FaPrint, FaTimes } from 'react-icons/fa';
import './PrintableQuote.css';
import { auth, db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

const PrintableQuote = ({ devis, onClose }) => {
  const [professionalData, setProfessionalData] = useState(null);

  useEffect(() => {
    const fetchProfessionalData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setProfessionalData(userDoc.data());
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données du professionnel:', error);
      }
    };

    fetchProfessionalData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Extraire l'adresse complète en composants
  const extractAddressComponents = (fullAddress) => {
    const addressParts = fullAddress?.split(',') || [];
    return {
      street: addressParts[0]?.trim() || '',
      postalCode: addressParts[1]?.match(/\d{5}/)?.toString() || '',
      city: addressParts[1]?.replace(/\d{5}/, '').trim() || ''
    };
  };

  // Fusionner les données du professionnel
  const professional = professionalData ? {
    ...professionalData,
    ...extractAddressComponents(professionalData.address)
  } : null;

  if (!devis || !professional) {
    return (
      <div className="print-preview-modal no-print">
        <div className="print-preview-content">
          <div className="print-preview-actions no-print">
            <button className="close-preview-button" onClick={onClose}>
              <FaTimes /> Fermer
            </button>
          </div>
          <div className="printable-quote">
            <p>Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="print-preview-modal no-print">
      <div className="print-preview-content">
        <div className="print-preview-actions no-print">
          <button className="print-button" onClick={handlePrint}>
            <FaPrint /> Imprimer
          </button>
          <button className="close-preview-button" onClick={onClose}>
            <FaTimes /> Fermer
          </button>
        </div>

        <div className="printable-quote">
          <div className="quote-header">
            <div className="professional-info">
              <div className="company-details">
                <h2 className="company-name">{professional.companyName}</h2>
                <p>{professional.street}</p>
                <p>{professional.postalCode} {professional.city}</p>
                <p>SIRET : {professional.siret}</p>
                <p>Tél : {professional.phone}</p>
                <p>Email : {professional.email}</p>
              </div>
            </div>
          </div>

          <div className="document-info">
            <div className="quote-details">
              <h1>Devis N° {devis?.id || 'N/A'}</h1>
              <p className="quote-date">Date d'émission : {formatDate(devis?.date || new Date())}</p>
              <p className="quote-validity">Validité : 30 jours</p>
            </div>
            <div className="client-details">
              <div className="client-box">
                <p className="client-title">DESTINATAIRE</p>
                <p className="client-name">{devis?.clientName || 'N/A'}</p>
                <p>{devis?.address || 'N/A'}</p>
                <p>{devis?.postalCode} {devis?.city}</p>
              </div>
            </div>
          </div>

          <div className="quote-table">
            <table>
              <thead>
                <tr>
                  <th>Qté</th>
                  <th>Description</th>
                  <th>Prix unitaire HT</th>
                  <th>PRIX TOTAL HT</th>
                </tr>
              </thead>
              <tbody>
                {devis?.services?.map((service, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td colSpan="4" className="section-title">{service.category}</td>
                    </tr>
                    <tr>
                      <td>1</td>
                      <td>
                        <ul>
                          {service.details?.map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      </td>
                      <td>{service.priceHT}€</td>
                      <td>{service.priceHT}€</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="totals">
            <div className="total-line">
              <span>TOTAL HT</span>
              <span>{devis?.totalHT || 0}€</span>
            </div>
            <div className="total-line">
              <span>TVA 10%</span>
              <span>{devis?.tva || 0}€</span>
            </div>
            <div className="total-line total-ttc">
              <span>NET A PAYER</span>
              <span>{devis?.totalTTC || 0}€</span>
            </div>
          </div>

          <div className="quote-footer">
            <div className="footer-content">
              <small>
                <p><strong>{professional.companyName}</strong> - {professional.sector}</p>
                <p>{professional.street}, {professional.postalCode} {professional.city}</p>
                <p>SIRET : {professional.siret} | Tél : {professional.phone} | Email : {professional.email}</p>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableQuote;
