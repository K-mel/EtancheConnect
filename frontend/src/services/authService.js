import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { auth, db, storage } from '../firebase';

// Fonction utilitaire pour traduire les codes d'erreur Firebase
const getErrorMessage = (error) => {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'L\'adresse email est invalide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé. Veuillez contacter le support.';
    case 'auth/user-not-found':
      return 'Aucun compte ne correspond à cette adresse email.';
    case 'auth/wrong-password':
      return 'Le mot de passe est incorrect.';
    case 'auth/email-already-in-use':
      return 'Cette adresse email est déjà utilisée par un autre compte.';
    case 'auth/operation-not-allowed':
      return 'Cette opération n\'est pas autorisée.';
    case 'auth/weak-password':
      return 'Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.';
    case 'auth/invalid-credential':
      return 'Les informations de connexion sont invalides. Veuillez vérifier votre email et mot de passe.';
    case 'auth/network-request-failed':
      return 'Erreur de connexion réseau. Veuillez vérifier votre connexion internet.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives de connexion. Veuillez réessayer plus tard.';
    case 'auth/requires-recent-login':
      return 'Cette opération nécessite une connexion récente. Veuillez vous reconnecter.';
    default:
      return 'Une erreur s\'est produite. Veuillez réessayer.';
  }
};

// Fonction d'inscription
export const register = async (email, password, role, userData) => {
  let createdUser = null;
  
  try {
    // 1. Créer l'utilisateur dans Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    createdUser = userCredential.user;

    // 2. Préparer les données de base
    const userDataForFirestore = {
      uid: createdUser.uid,
      email,
      role,
      displayName: userData.displayName || userData.companyName,
      createdAt: new Date().toISOString(),
      status: role === 'professionnel' ? 'pending' : 'active',
      type: role
    };

    // 3. Si professionnel, ajouter les données spécifiques
    if (role === 'professionnel') {
      Object.assign(userDataForFirestore, {
        companyName: userData.companyName,
        siret: userData.siret,
        address: userData.address,
        phone: userData.phone,
        bankName: userData.bankName,
        iban: userData.iban,
        bic: userData.bic,
        serviceDescription: userData.serviceDescription,
        workingArea: userData.workingArea,
        rates: userData.rates,
        acceptTerms: userData.acceptTerms,
        documents: userData.documents || {}
      });
    }

    // 4. Sauvegarder dans Firestore
    await setDoc(doc(db, 'users', createdUser.uid), userDataForFirestore);

    return {
      user: createdUser,
      userData: userDataForFirestore
    };
  } catch (error) {
    // 5. En cas d'erreur, nettoyer
    if (createdUser) {
      try {
        await createdUser.delete();
      } catch (deleteError) {
        console.error('Erreur lors de la suppression du compte:', deleteError);
      }
    }
    
    // 6. Propager l'erreur avec un message approprié
    const errorMessage = error.code ? getErrorMessage(error) : error.message;
    throw {
      code: error.code || 'unknown',
      message: errorMessage
    };
  }
};

// Fonction de connexion
export const login = async (email, password) => {
  try {
    // Vérification basique du format email
    if (!email || !email.includes('@')) {
      throw new Error('Format d\'email invalide');
    }

    // Vérification du mot de passe
    if (!password || password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Récupérer les données utilisateur supplémentaires depuis Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Stocker les données utilisateur dans le localStorage
      localStorage.setItem('userData', JSON.stringify({
        ...userData,
        uid: user.uid,
        email: user.email
      }));
      return {
        user,
        userData
      };
    } else {
      throw new Error('Données utilisateur non trouvées');
    }
  } catch (error) {
    throw {
      code: error.code,
      message: getErrorMessage(error)
    };
  }
};

// Fonction de déconnexion
export const logout = async () => {
  try {
    await signOut(auth);
    // Nettoyer les données locales si nécessaire
    localStorage.removeItem('userData');
    return true;
  } catch (error) {
    throw error;
  }
};

// Fonction de réinitialisation du mot de passe
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Un email de réinitialisation a été envoyé à votre adresse email.'
    };
  } catch (error) {
    throw {
      code: error.code,
      message: getErrorMessage(error)
    };
  }
};

// Fonction pour obtenir les données utilisateur
export const getUserData = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    throw error;
  }
};

// Fonction pour obtenir le rôle de l'utilisateur
export const getUserRole = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().role;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

// Fonction pour mettre à jour le profil utilisateur
export const updateUserProfile = async (userId, userData) => {
  try {
    await setDoc(doc(db, 'users', userId), userData, { merge: true });
  } catch (error) {
    throw error;
  }
};

// Fonction pour promouvoir un utilisateur en administrateur
export const promoteToAdmin = async (userId) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      role: 'administrateur',
      isAdmin: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    throw error;
  }
};

const authService = {
  register,
  login,
  logout,
  resetPassword,
  getUserData,
  getUserRole,
  updateUserProfile,
  promoteToAdmin
};

export default authService;
