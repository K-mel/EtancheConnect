import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

const DevisList = ({ userType }) => {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchDevis = async () => {
      try {
        let devisQuery;
        
        if (userType === 'particulier') {
          // Pour les particuliers, on récupère leurs devis
          devisQuery = query(
            collection(db, 'devis'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else if (userType === 'professionnel') {
          // Pour les professionnels, on récupère tous les devis en attente
          devisQuery = query(
            collection(db, 'devis'),
            where('status', '==', 'en_attente'),
            orderBy('createdAt', 'desc')
          );
        } else if (userType === 'admin') {
          // Pour les admins, on récupère tous les devis
          devisQuery = query(
            collection(db, 'devis'),
            orderBy('createdAt', 'desc')
          );
        }

        const querySnapshot = await getDocs(devisQuery);
        const devisList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate().toLocaleDateString('fr-FR') || 'Date inconnue'
        }));

        setDevis(devisList);
      } catch (err) {
        console.error('Erreur lors de la récupération des devis:', err);
        setError('Une erreur est survenue lors du chargement des devis.');
      } finally {
        setLoading(false);
      }
    };

    fetchDevis();
  }, [currentUser, userType]);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'accepte':
        return 'Accepté';
      case 'refuse':
        return 'Refusé';
      default:
        return 'Inconnu';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'en_attente':
        return 'status en_attente';
      case 'accepte':
        return 'status accepte';
      case 'refuse':
        return 'status refuse';
      default:
        return 'status';
    }
  };

  if (loading) {
    return <div className="loading">Chargement des devis...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="devis-list">
      <h2>Vos devis</h2>
      {devis.length === 0 ? (
        <p>Aucun devis trouvé.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type de projet</th>
              <th>Surface</th>
              <th>Ville</th>
              <th>Status</th>
              {userType !== 'particulier' && <th>Contact</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devis.map((devis) => (
              <tr key={devis.id}>
                <td>{devis.createdAt}</td>
                <td>{devis.typeProjet}</td>
                <td>{devis.surface} m²</td>
                <td>{devis.ville}</td>
                <td>
                  <span className={getStatusClass(devis.status)}>
                    {getStatusLabel(devis.status)}
                  </span>
                </td>
                {userType !== 'particulier' && (
                  <td>{devis.userEmail}</td>
                )}
                <td>
                  <button 
                    className="action-button"
                    onClick={() => {/* TODO: Implémenter la vue détaillée */}}
                  >
                    Voir détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DevisList;
