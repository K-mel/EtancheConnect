import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ERROR_MESSAGES } from '../utils/constants';

const messaging = getMessaging();

// Demander la permission pour les notifications
export const checkNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      throw new Error('Ce navigateur ne supporte pas les notifications desktop');
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'denied') {
      throw new Error('NOTIFICATIONS_BLOCKED');
    }
    
    if (permission === 'default') {
      throw new Error('NOTIFICATIONS_DISMISSED');
    }

    return permission === 'granted';
  } catch (error) {
    if (error.message === 'NOTIFICATIONS_BLOCKED') {
      throw new Error('Les notifications sont bloquées. Veuillez les activer dans les paramètres de votre navigateur.');
    }
    if (error.message === 'NOTIFICATIONS_DISMISSED') {
      throw new Error('Vous avez ignoré la demande de notifications. Veuillez rafraîchir la page pour réessayer.');
    }
    throw error;
  }
};

export const requestNotificationPermission = async (userId, userRole) => {
  try {
    const permission = await checkNotificationPermission();
    if (!permission) {
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
    });
    
    if (!token) {
      throw new Error('Impossible d\'obtenir le token de notification');
    }

    // Sauvegarder le token dans Firestore
    await setDoc(doc(db, "userTokens", userId), {
      token,
      userRole,
      updatedAt: serverTimestamp()
    });
    
    return token;
  } catch (error) {
    console.error("Erreur lors de la demande de permission:", error);
    throw error;
  }
};

// Créer une nouvelle notification
export const createNotification = async (userId, notification) => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      ...notification,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error);
    throw error;
  }
};

// Écouter les notifications entrantes
export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};

// Fonctions spécifiques pour chaque type de notification
export const sendQuestionNotification = async (particulierId, professionalId, questionData) => {
  const notification = {
    type: 'QUESTION',
    title: 'Nouvelle question',
    body: `Un particulier vous a posé une question : ${questionData.question}`,
    data: {
      particulierId,
      questionId: questionData.id
    },
    recipientId: professionalId
  };

  await createNotification(professionalId, notification);
};

// Récupérer les IDs des administrateurs
async function getAdminIds() {
  const q = query(collection(db, "users"), where("role", "==", "administrateur"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.id);
}

export const sendAdminNotification = async (type, data) => {
  const notificationTypes = {
    NEW_QUOTE_REQUEST: "Nouvelle demande de devis",
    NEW_MESSAGE: "Nouveau message",
    NEW_REPORT: "Nouveau signalement",
    PENDING_SIGNATURE: "Devis en attente de signature",
    PAYMENT_COMPLETED: "Paiement effectué"
  };

  const notification = {
    type,
    title: notificationTypes[type],
    message: `Un nouveau ${notificationTypes[type].toLowerCase()} nécessite votre attention`,
    data
  };

  // Envoyer à tous les administrateurs
  const adminIds = await getAdminIds();
  for (const adminId of adminIds) {
    await createNotification(adminId, notification);
  }
};

export const createMessageNotification = async (receiverId, senderId, messageData, isValidated = false) => {
  try {
    // Ne créer la notification que si le message est validé
    if (!isValidated) {
      console.log('Message non validé, pas de notification créée');
      return;
    }

    console.log('Création de notification avec les données:', {
      receiverId,
      senderId,
      messageData
    });

    // Récupérer les informations de l'expéditeur
    const senderDoc = await getDoc(doc(db, 'users', senderId));
    console.log('Données de l\'expéditeur:', senderDoc.data());

    const senderName = senderDoc.exists() 
      ? (senderDoc.data().displayName || senderDoc.data().nom || 'Utilisateur') 
      : 'Utilisateur';

    // Créer l'objet de notification
    const notification = {
      type: 'NEW_MESSAGE',
      title: 'Nouveau message validé',
      message: `Nouveau message validé de ${senderName}`,
      userId: receiverId,
      fromUserId: senderId,
      messageId: messageData.id,
      messageContent: messageData.content,
      createdAt: serverTimestamp(),
      read: false
    };

    console.log('Objet notification à créer:', notification);

    // Ajouter la notification à Firestore
    const notificationRef = await addDoc(collection(db, 'notifications'), notification);
    console.log('Notification créée avec ID:', notificationRef.id);

    return notificationRef.id;
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    throw error;
  }
};

// Notification pour l'administrateur lors de l'arrivée d'un nouveau message à valider
export const createPendingMessageNotification = async (senderId, messageData) => {
  try {
    // Récupérer les informations de l'expéditeur
    const senderDoc = await getDoc(doc(db, 'users', senderId));
    const senderName = senderDoc.exists() 
      ? (senderDoc.data().displayName || senderDoc.data().nom || 'Utilisateur') 
      : 'Utilisateur';

    // Créer la notification pour tous les administrateurs
    const adminIds = await getAdminIds();
    
    for (const adminId of adminIds) {
      const notification = {
        type: 'PENDING_MESSAGE',
        title: 'Nouveau message à valider',
        message: `Nouveau message de ${senderName} en attente de validation`,
        userId: adminId,
        fromUserId: senderId,
        messageId: messageData.id,
        messageContent: messageData.content,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'notifications'), notification);
    }
  } catch (error) {
    console.error('Erreur lors de la création de la notification de message en attente:', error);
    throw error;
  }
};

// Notification pour l'administrateur lors de la validation d'une demande de devis
export const createQuoteRequestValidationNotification = async (requestData) => {
  try {
    const particulierDoc = await getDoc(doc(db, 'users', requestData.particulierId));
    const particulierName = particulierDoc.exists() 
      ? (particulierDoc.data().displayName || particulierDoc.data().nom || 'Utilisateur') 
      : 'Utilisateur';

    // Récupérer tous les administrateurs
    const adminQuery = query(
      collection(db, 'users'),
      where('role', '==', 'administrateur')
    );
    
    const adminSnapshot = await getDocs(adminQuery);
    
    // Créer une notification pour chaque administrateur
    const notificationPromises = adminSnapshot.docs.map(adminDoc => {
      const notification = {
        type: 'QUOTE_REQUEST_VALIDATION',
        title: 'Nouvelle demande de devis à valider',
        message: `Demande de devis de ${particulierName} - ${requestData.type} - ${requestData.surface}m² à ${requestData.ville}`,
        userId: adminDoc.id,
        fromUserId: requestData.particulierId,
        requestId: requestData.id,
        createdAt: serverTimestamp(),
        read: false,
        data: {
          devisId: requestData.id,
          type: requestData.type,
          surface: requestData.surface,
          ville: requestData.ville
        }
      };

      return addDoc(collection(db, 'notifications'), notification);
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Erreur lors de la création de la notification de demande de devis:', error);
    throw error;
  }
};

// Notification pour l'administrateur lors de la validation d'un devis
export const createQuoteValidationNotification = async (quoteData) => {
  try {
    const professionalDoc = await getDoc(doc(db, 'users', quoteData.professionalId));
    const professionalName = professionalDoc.exists() 
      ? (professionalDoc.data().displayName || professionalDoc.data().companyName || 'Professionnel') 
      : 'Professionnel';

    // Notifier tous les administrateurs
    const adminIds = await getAdminIds();
    
    for (const adminId of adminIds) {
      const notification = {
        type: 'QUOTE_VALIDATION',
        title: 'Nouveau devis à valider',
        message: `Devis de ${professionalName} en attente de validation`,
        userId: adminId,
        fromUserId: quoteData.professionalId,
        quoteId: quoteData.id,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'notifications'), notification);
    }
  } catch (error) {
    console.error('Erreur lors de la création de la notification de validation de devis:', error);
    throw error;
  }
};

// Notification pour le particulier quand sa demande de devis est validée
export const createQuoteRequestValidatedNotification = async (devisData) => {
  try {
    const notification = {
      type: 'QUOTE_REQUEST_VALIDATED',
      title: 'Votre demande de devis a été validée',
      message: `Votre demande de devis pour ${devisData.typeProjet} (${devisData.surface}m² à ${devisData.ville}) a été validée. Elle est maintenant visible par les professionnels qui pourront vous faire une proposition.`,
      userId: devisData.userId,
      quoteId: devisData.id,
      createdAt: serverTimestamp(),
      read: false
    };

    await addDoc(collection(db, 'notifications'), notification);
  } catch (error) {
    console.error('Erreur lors de la création de la notification pour le particulier:', error);
    throw error;
  }
};

// Notification pour les professionnels quand une nouvelle demande de devis est validée
export const notifyProfessionalsNewQuoteRequest = async (devisData) => {
  try {
    // Récupérer tous les professionnels
    const professionalQuery = query(
      collection(db, 'users'),
      where('role', '==', 'professionnel')
    );
    
    const professionalSnapshot = await getDocs(professionalQuery);
    
    // Créer une notification pour chaque professionnel
    const notificationPromises = professionalSnapshot.docs.map(professionalDoc => {
      const notification = {
        type: 'NEW_QUOTE_REQUEST',
        title: 'Nouvelle demande de devis disponible',
        message: `Une nouvelle demande de devis pour des travaux d'${devisData.typeProjet} est disponible. Surface: ${devisData.surface}m² à ${devisData.ville}`,
        userId: professionalDoc.id,
        quoteId: devisData.id,
        createdAt: serverTimestamp(),
        read: false,
        data: {
          devisId: devisData.id,
          type: devisData.typeProjet,
          surface: devisData.surface,
          ville: devisData.ville
        }
      };

      return addDoc(collection(db, 'notifications'), notification);
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Erreur lors de la notification des professionnels:', error);
    throw error;
  }
};