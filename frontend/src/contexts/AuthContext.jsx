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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Créer le document utilisateur dans Firestore
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        email,
        userType: type,
        createdAt: new Date().toISOString()
      });

      setUserType(type); // Mettre à jour le type d'utilisateur immédiatement
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
        setUserType(userData.userType);
        console.log('Type utilisateur défini:', userData.userType);
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
      console.log('État de l\'authentification changé:', user?.email);
      
      if (user) {
        try {
          if (user.email === 'admin@etancheconnect.fr') {
            console.log('Admin détecté');
            setUserType('admin');
            setCurrentUser(user);
          } else {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            console.log('Document utilisateur récupéré:', userDoc.data());
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserType(userData.type || userData.userType);
              const userInfo = {
                ...user,
                ...userData,
                nomComplet: userData.nomComplet || userData.nom
              };
              console.log('Données utilisateur mises à jour:', userInfo);
              setCurrentUser(userInfo);
            } else {
              console.error('Document utilisateur non trouvé');
              await logout();
            }
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données:', error);
          await logout();
        }
      } else {
        console.log('Aucun utilisateur connecté');
        setCurrentUser(null);
        setUserType(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userType,
    signup,
    login,
    logout
  };

  console.log('AuthProvider - État actuel:', { currentUser: !!currentUser, userType });

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
