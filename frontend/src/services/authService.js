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

// Fonction d'inscription
export const register = async (email, password, role, userData) => {
  try {
    // Créer l'utilisateur dans Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Si des documents sont fournis et que c'est un professionnel
    if (userData.documents && role === 'professionnel') {
      const uploadedDocs = {};
      
      // Upload chaque document
      for (const [key, file] of Object.entries(userData.documents)) {
        if (file) {
          const storageRef = ref(storage, `documents/${user.uid}/${key}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          uploadedDocs[key] = url;
        }
      }
      
      userData.documents = uploadedDocs;
    }

    // Créer le document utilisateur dans Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      role,
      ...userData,
      createdAt: new Date().toISOString(),
      status: role === 'professionnel' ? 'pending' : 'active'
    });

    return user;
  } catch (error) {
    throw error;
  }
};

// Fonction de connexion
export const login = async (email, password) => {
  try {
    console.log('Tentative de connexion avec email:', email);
    
    // Vérification basique du format email
    if (!email || !email.includes('@')) {
      throw new Error('Format d\'email invalide');
    }

    // Vérification du mot de passe
    if (!password || password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Erreur de connexion:', {
      code: error.code,
      message: error.message
    });
    
    // Traduction des erreurs Firebase courantes
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('Aucun compte ne correspond à cet email');
      case 'auth/wrong-password':
        throw new Error('Mot de passe incorrect');
      case 'auth/invalid-email':
        throw new Error('Format d\'email invalide');
      case 'auth/user-disabled':
        throw new Error('Ce compte a été désactivé');
      default:
        throw error;
    }
  }
};

// Fonction de déconnexion
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Fonction de réinitialisation du mot de passe
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
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

const authService = {
  register,
  login,
  logout,
  resetPassword,
  getUserData,
  getUserRole,
  updateUserProfile
};

export default authService;
