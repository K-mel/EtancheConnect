import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import './DevisList.css';

const DevisList = ({ userType }) => {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDevis, setSelectedDevis] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchDevis = async () => {
      try {
        let devisQuery;
        
        if (userType === 'particulier') {
          devisQuery = query(
            collection(db, 'devis'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else if (userType === 'professionnel') {
          devisQuery = query(
            collection(db, 'devis'),
            where('status', '==', 'en_attente'),
            orderBy('createdAt', 'desc')
          );
        } else if (userType === 'admin') {
          devisQuery = query(
            collection(db, 'devis'),
            orderBy('createdAt', 'desc')
          );
        }

        const querySnapshot = await getDocs(devisQuery);
        const devisList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let formattedDate;
          
          if (data.createdAt && data.createdAt.toDate) {
            try {
              formattedDate = data.createdAt.toDate().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });
            } catch (error) {
              console.error('Error formatting date:', error);
              formattedDate = 'Date invalide';
            }
          } else {
            formattedDate = 'Date non disponible';
          }

          return {
            id: doc.id,
            ...data,
            createdAt: formattedDate
          };
        });

        setDevis(devisList);
      } catch (err) {
        console.error('Erreur lors de la récupération des devis:', err);
        setError('Une erreur est survenue lors du chargement des devis.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && userType) {
      fetchDevis();
    }
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

  const handleViewDetails = (devis) => {
    setSelectedDevis(devis);
  };

  const closeModal = () => {
    setSelectedDevis(null);
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
        <>
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
                      onClick={() => handleViewDetails(devis)}
                    >
                      Voir détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedDevis && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Détails du devis</h3>
                  <button className="close-button" onClick={closeModal}>&times;</button>
                </div>
                <div className="modal-body">
                  <div className="detail-row">
                    <strong>Date de création:</strong>
                    <span>{selectedDevis.createdAt}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Type de projet:</strong>
                    <span>{selectedDevis.typeProjet}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Surface:</strong>
                    <span>{selectedDevis.surface} m²</span>
                  </div>
                  <div className="detail-row">
                    <strong>Description:</strong>
                    <p>{selectedDevis.description}</p>
                  </div>
                  <div className="detail-row">
                    <strong>Adresse:</strong>
                    <p>{selectedDevis.adresse}</p>
                  </div>
                  <div className="detail-row">
                    <strong>Ville:</strong>
                    <span>{selectedDevis.ville}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Code postal:</strong>
                    <span>{selectedDevis.codePostal}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Disponibilité:</strong>
                    <span>{selectedDevis.disponibilite}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Statut:</strong>
                    <span className={getStatusClass(selectedDevis.status)}>
                      {getStatusLabel(selectedDevis.status)}
                    </span>
                  </div>
                  {selectedDevis.photos && selectedDevis.photos.length > 0 && (
                    <div className="detail-row">
                      <strong>Photos:</strong>
                      <div className="photos-grid">
                        {selectedDevis.photos.map((photo, index) => (
                          <img 
                            key={index} 
                            src={photo} 
                            alt={`Photo ${index + 1}`} 
                            className="devis-photo"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="close-button" onClick={closeModal}>Fermer</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DevisList;
