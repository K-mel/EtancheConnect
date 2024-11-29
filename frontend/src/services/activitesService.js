import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const createActivite = async (type, titre, description, metadata = {}) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('Pas d\'utilisateur connecté pour créer une activité');
      return null;
    }

    const activiteData = {
      userId: user.uid,
      type,
      titre,
      description,
      metadata,
      timestamp: serverTimestamp()
    };

    const activitesRef = collection(db, 'activites');
    return await addDoc(activitesRef, activiteData);
  } catch (error) {
    console.error('Erreur lors de la création de l\'activité:', error);
    return null;
  }
};

// Exemples de fonctions pour différents types d'activités
export const logDevisCreation = async (devisId, clientName) => {
  return createActivite(
    'devis', 
    'Nouveau devis', 
    `Devis créé pour ${clientName}`, 
    { devisId }
  );
};

export const logMessageEnvoi = async (destinataire) => {
  return createActivite(
    'message', 
    'Message envoyé', 
    `Message envoyé à ${destinataire}`
  );
};

export const logConnexion = async () => {
  return createActivite(
    'connexion', 
    'Connexion', 
    'Connexion réussie'
  );
};
