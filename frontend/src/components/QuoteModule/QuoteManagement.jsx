import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase-config';
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

  // ... Reste du composant (UI, etc.)

  return (
    <div className="quote-management">
      {/* Implémentez votre interface utilisateur ici */}
    </div>
  );
};

export default QuoteManagement;
