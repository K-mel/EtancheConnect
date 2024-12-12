import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  sendQuoteNotification, 
  sendQuoteRequestNotification, 
  sendAdminNotification 
} from '../../services/notificationService';
import './QuoteManagement.css';

const QuoteManagement = () => {
  const { currentUser } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Créer une nouvelle demande de devis
  const createQuoteRequest = async (requestData) => {
    try {
      const quoteRequestRef = await addDoc(collection(db, 'quoteRequests'), {
        ...requestData,
        status: 'pending',
        createdAt: serverTimestamp(),
        userId: currentUser.uid
      });

      // Notifier les professionnels concernés
      const professionals = await getProfessionalsForService(requestData.serviceType);
      for (const professional of professionals) {
        await sendQuoteRequestNotification(
          professional.id,
          {
            requestId: quoteRequestRef.id,
            serviceType: requestData.serviceType,
            description: requestData.description
          }
        );
      }

      // Notifier les administrateurs
      await sendAdminNotification('NEW_QUOTE_REQUEST', {
        requestId: quoteRequestRef.id,
        userId: currentUser.uid,
        serviceType: requestData.serviceType
      });

      return quoteRequestRef;
    } catch (error) {
      console.error('Erreur lors de la création de la demande de devis:', error);
      throw error;
    }
  };

  // Envoyer un devis
  const sendQuote = async (quoteData, particulierId) => {
    try {
      const quoteRef = await addDoc(collection(db, 'quotes'), {
        ...quoteData,
        status: 'pending',
        professionalId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      // Notifier le particulier
      await sendQuoteNotification(
        particulierId,
        currentUser.uid,
        {
          quoteId: quoteRef.id,
          amount: quoteData.amount,
          serviceType: quoteData.serviceType
        }
      );

      // Notifier les administrateurs
      await sendAdminNotification('PENDING_SIGNATURE', {
        quoteId: quoteRef.id,
        professionalId: currentUser.uid,
        particulierId,
        amount: quoteData.amount
      });

      return quoteRef;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du devis:', error);
      throw error;
    }
  };

  // Accepter un devis
  const acceptQuote = async (quoteId) => {
    try {
      const quoteRef = doc(db, 'quotes', quoteId);
      await updateDoc(quoteRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      const quoteDoc = await getDoc(quoteRef);
      const quoteData = quoteDoc.data();

      // Notifier les administrateurs
      await sendAdminNotification('PAYMENT_COMPLETED', {
        quoteId,
        professionalId: quoteData.professionalId,
        particulierId: currentUser.uid,
        amount: quoteData.amount
      });
    } catch (error) {
      console.error('Erreur lors de l\'acceptation du devis:', error);
      throw error;
    }
  };

  // Récupérer les professionnels pour un type de service
  const getProfessionalsForService = async (serviceType) => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'professional'),
      where('services', 'array-contains', serviceType)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  };

  // Effet pour charger les devis
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setLoading(true);
        const quotesRef = collection(db, 'quotes');
        let q;

        if (currentUser.role === 'administrateur') {
          q = query(quotesRef, orderBy('createdAt', 'desc'));
        } else {
          q = query(
            quotesRef,
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        }

        const snapshot = await getDocs(q);
        const quotesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setQuotes(quotesData);
      } catch (error) {
        console.error('Erreur lors du chargement des devis:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchQuotes();
    }
  }, [currentUser]);

  // Filtrer les devis en fonction de la recherche
  const filteredQuotes = quotes.filter(quote => {
    if (!searchQuery) return true;
    
    const devisNumber = quote.devisNumber?.toLowerCase() || '';
    return devisNumber.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="quote-management">
      {currentUser?.role === 'administrateur' && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Rechercher un numéro de devis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      )}
      
      <div className="quotes-list">
        {loading ? (
          <div className="loading">Chargement des devis...</div>
        ) : filteredQuotes.length === 0 ? (
          <div className="no-quotes">
            {searchQuery 
              ? `Aucun devis trouvé pour "${searchQuery}"` 
              : "Aucun devis disponible"}
          </div>
        ) : (
          filteredQuotes.map(quote => (
            <div key={quote.id} className="quote-item">
              <h3>Devis N° {quote.devisNumber}</h3>
              <p>Status: {quote.status}</p>
              <p>Date: {quote.createdAt?.toDate().toLocaleDateString()}</p>
              {/* Autres détails du devis */}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuoteManagement;
