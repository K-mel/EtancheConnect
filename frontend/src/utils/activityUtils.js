import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Enregistre une nouvelle activité dans Firestore
 * @param {string} type - Le type d'activité ('devis', 'message', 'projet', etc.)
 * @param {string} title - Le titre de l'activité
 * @param {string} description - La description de l'activité
 * @param {string} userId - L'ID de l'utilisateur concerné
 * @returns {Promise<void>}
 */
export const logActivity = async (type, title, description, userId) => {
  try {
    const activityData = {
      type,
      title,
      description,
      userId,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'activites'), activityData);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    // On ne relance pas l'erreur pour éviter d'interrompre le flux principal
  }
};

/**
 * Types d'activités disponibles
 */
export const ActivityTypes = {
  DEVIS: 'devis',
  MESSAGE: 'message',
  PROJET: 'projet',
  USER: 'user',
  SYSTEM: 'system'
};
