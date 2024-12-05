import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { formatDevisNumber } from '../../utils/formatters';
import './DevisList.css';

const ReceivedQuotesList = () => {
  const [receivedQuotes, setReceivedQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchReceivedQuotes();
  }, [currentUser]);

  const fetchReceivedQuotes = async () => {
    try {
      console.log("Fetching quotes for user email:", currentUser.email);
      
      const q = query(
        collection(db, 'professionalQuotes'),
        where('clientEmail', '==', currentUser.email)
      );

      console.log("Executing Firestore query...");
      const querySnapshot = await getDocs(q);
      console.log("Number of quotes found:", querySnapshot.size);
      
      const quotes = [];
      
      for (const docRef of querySnapshot.docs) {
        const quoteData = docRef.data();
        console.log("Quote data:", quoteData);
        
        try {
          const devisRef = doc(db, 'devis', quoteData.devisId);
          const devisSnap = await getDoc(devisRef);
          
          quotes.push({
            id: docRef.id,
            ...quoteData,
            devisOriginal: devisSnap.exists() ? {
              id: devisSnap.id,
              ...devisSnap.data()
            } : {
              id: quoteData.devisId
            }
          });
          console.log("Added quote:", docRef.id);
        } catch (error) {
          console.error("Error fetching original devis:", error);
          quotes.push({
            id: docRef.id,
            ...quoteData
          });
        }
      }

      console.log("Final quotes array:", quotes);
      setReceivedQuotes(quotes);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching received quotes:", error);
      setLoading(false);
    }
  };

  const handleViewQuote = (quote) => {
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  const handleSignQuote = async (quoteId) => {
    try {
      await updateDoc(doc(db, 'professionalQuotes', quoteId), {
        status: 'en_attente_signature',
        updatedAt: serverTimestamp()
      });
      
      handleElectronicSignature(quoteId);
    } catch (error) {
      console.error("Erreur lors de la signature du devis:", error);
    }
  };

  const handleElectronicSignature = (quoteId) => {
    // Implémenter la logique de signature électronique
  };

  const handlePayment = (quoteId) => {
    // Implémenter la logique de paiement
  };

  const renderModal = () => {
    if (!selectedQuote) return null;

    return (
      <div className="quote-modal-overlay" onClick={() => setIsModalOpen(false)}>
        <div className="quote-modal-content" onClick={e => e.stopPropagation()}>
          <div className="quote-modal-header">
            <h2>Détails du devis</h2>
            <button className="close-button" onClick={() => setIsModalOpen(false)}>&times;</button>
          </div>
          
          <div className="quote-modal-body">
            <div className="quote-details">
              <h3>Informations du devis</h3>
              <p><strong>Professionnel:</strong> {selectedQuote.companyName}</p>
              <p><strong>N° Demande:</strong> {selectedQuote.devisOriginal?.id || 'Non disponible'}</p>
              <p><strong>N° Devis:</strong> {selectedQuote.id}</p>
              <p><strong>Montant HT:</strong> {selectedQuote.subtotalHT.toLocaleString('fr-FR')}€</p>
              <p><strong>TVA:</strong> {selectedQuote.tva.toLocaleString('fr-FR')}€</p>
              <p><strong>Montant TTC:</strong> {selectedQuote.totalTTC.toLocaleString('fr-FR')}€</p>
              <p><strong>Acompte demandé:</strong> {selectedQuote.deposit.toLocaleString('fr-FR')}€</p>
              <p><strong>Description:</strong> {selectedQuote.workDescription}</p>
              
              <div className="quote-materials">
                <h4>Matériaux consommables</h4>
                <ul>
                  {selectedQuote.consumableMaterials?.map((material, index) => (
                    <li key={index}>
                      {material.description} - {material.quantity} x {material.unitPrice}€
                    </li>
                  ))}
                </ul>
              </div>

              <div className="quote-labor">
                <h4>Main d'œuvre</h4>
                <p>{selectedQuote.laborDetails?.description} - {selectedQuote.laborDetails?.quantity} x {selectedQuote.laborDetails?.unitPrice}€</p>
              </div>
            </div>

            <div className="quote-actions">
              {selectedQuote.status === 'en_attente_validation' && (
                <button 
                  className="action-button sign-button"
                  onClick={() => handleSignQuote(selectedQuote.id)}
                >
                  Signer le devis
                </button>
              )}
              {selectedQuote.status === 'en_attente_signature' && (
                <button 
                  className="action-button payment-button"
                  onClick={() => handlePayment(selectedQuote.id)}
                >
                  Procéder au paiement de l'acompte
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Chargement des devis reçus...</div>;
  }

  return (
    <div className="received-quotes-container">
      <h2>Mes devis reçus</h2>
      
      <div className="quotes-table-container">
        <table className="devis-table">
          <thead>
            <tr>
              <th>N° Demande</th>
              <th>Professionnel</th>
              <th>Date</th>
              <th>Montant TTC</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {receivedQuotes.map((quote) => (
              <tr key={quote.id}>
                <td>{formatDevisNumber(quote.devisId)}</td>
                <td>{quote.companyName}</td>
                <td>{new Date(quote.createdAt?.toDate()).toLocaleDateString()}</td>
                <td>{quote.totalTTC.toLocaleString('fr-FR')}€</td>
                <td>
                  <span className={`status ${quote.status}`}>
                    {quote.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="action-button voir"
                    onClick={() => handleViewQuote(quote)}
                  >
                    Voir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && renderModal()}
    </div>
  );
};

export default ReceivedQuotesList;
