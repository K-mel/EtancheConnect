import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, type, userData) {
    try {
      console.log('Début de l\'inscription avec type:', type);
      console.log('Données utilisateur reçues:', userData);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Créer le document utilisateur dans Firestore avec un type cohérent
      const userDataToStore = {
        ...userData,
        email,
        type: type, // S'assurer que le type est toujours présent
        userType: type, // Pour la compatibilité avec l'ancien code
        createdAt: new Date().toISOString(),
        status: userData.status || 'pending'
      };

      // Supprimer les doublons potentiels
      delete userDataToStore.userType;

      console.log('Données à enregistrer dans Firestore:', userDataToStore);
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, userDataToStore);
      
      // Vérifier que les données ont été correctement enregistrées
      const savedDoc = await getDoc(userRef);
      console.log('Données enregistrées dans Firestore:', savedDoc.data());

      // Mettre à jour le contexte
      setCurrentUser({
        ...user,
        ...userDataToStore
      });
      setUserType(type);

      return user;
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      console.log('Tentative de connexion pour:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (email === 'admin@etancheconnect.fr') {
        console.log('Connexion admin détectée');
        setUserType('admin');
        return userCredential.user;
      }

      // Récupérer les données utilisateur depuis Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      console.log('Document utilisateur:', userDoc.data());
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserType(userData.userType || userData.type);
        console.log('Type utilisateur défini:', userData.userType || userData.type);
      } else {
        console.error('Document utilisateur non trouvé');
        throw new Error('Document utilisateur non trouvé');
      }

      return userCredential.user;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      console.log('Déconnexion...');
      setCurrentUser(null);
      setUserType(null);
      await signOut(auth);
      console.log('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  }

  useEffect(() => {
    console.log('AuthProvider - useEffect démarré');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log('Utilisateur connecté:', user.email);
          
          // Récupérer les données utilisateur de Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log('Données utilisateur Firestore:', userData);
            
            // Définir le type d'utilisateur de manière cohérente
            const userType = userData.type || userData.userType;
            
            // Si aucun type n'est défini, mettre à jour le document avec un type par défaut
            if (!userType && user.email === 'admin@etancheconnect.fr') {
              await setDoc(userDocRef, { ...userData, type: 'admin' }, { merge: true });
            } else if (!userType) {
              await setDoc(userDocRef, { ...userData, type: 'particulier' }, { merge: true });
            }
            
            // Mettre à jour le contexte avec les données complètes
            setCurrentUser({
              ...user,
              ...userData,
              type: userType || 'particulier'
            });
            setUserType(userType || 'particulier');
          } else {
            console.error('Document utilisateur non trouvé dans Firestore');
            setCurrentUser(user);
            setUserType(null);
          }
        } else {
          console.log('Aucun utilisateur connecté');
          setCurrentUser(null);
          setUserType(null);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setCurrentUser(null);
        setUserType(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userType,
    signup,
    login,
    logout,
    loading
  };

  console.log('AuthProvider - Valeur fournie au contexte:', value);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
