import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import './MesDevisContent.css';

const MesDevisContent = () => {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchDevis = async () => {
      try {
        const q = query(
          collection(db, 'devis'),
          where('particulierId', '==', currentUser.uid),
          where('status', '==', 'proposé')
        );
        
        const querySnapshot = await getDocs(q);
        const devisData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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

  if (loading) {
    return <div>Chargement des devis...</div>;
  }

  if (devis.length === 0) {
    return <div>Vous n'avez pas encore reçu de propositions de devis.</div>;
  }

  return (
    <div className="mes-devis-content">
      <div className="devis-grid">
        {devis.map((devis) => (
          <div key={devis.id} className="devis-card">
            <h3>Devis #{devis.id.slice(0, 8)}</h3>
            <div className="devis-details">
              <p><strong>Professionnel:</strong> {devis.professionnelNom}</p>
              <p><strong>Date:</strong> {new Date(devis.dateCreation.toDate()).toLocaleDateString()}</p>
              <p><strong>Montant proposé:</strong> {devis.montant}€</p>
              <p><strong>Description:</strong> {devis.description}</p>
            </div>
            <div className="devis-actions">
              <button className="accept-btn">Accepter</button>
              <button className="reject-btn">Refuser</button>
              <button className="contact-btn">Contacter</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MesDevisContent;
