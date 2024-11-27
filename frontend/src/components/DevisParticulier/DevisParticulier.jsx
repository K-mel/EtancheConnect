import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import './DevisParticulier.css';

const DevisParticulier = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    typeProjet: '',
    surface: '',
    description: '',
    adresse: '',
    ville: '',
    codePostal: '',
    disponibilite: '',
    photos: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prevState => ({
      ...prevState,
      photos: Array.from(e.target.files)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      if (!currentUser) {
        throw new Error('Vous devez être connecté pour soumettre un devis');
      }

      // Upload des photos
      const photoUrls = [];
      if (formData.photos.length > 0) {
        for (const photo of formData.photos) {
          try {
            const photoRef = ref(storage, `devis_photos/${currentUser.uid}/${Date.now()}_${photo.name}`);
            const snapshot = await uploadBytes(photoRef, photo);
            const url = await getDownloadURL(snapshot.ref);
            photoUrls.push(url);
          } catch (uploadError) {
            console.error('Erreur lors de l\'upload de la photo:', uploadError);
            throw new Error('Erreur lors de l\'upload des photos. Veuillez réessayer.');
          }
        }
      }

      // Préparer les données du devis
      const devisData = {
        typeProjet: formData.typeProjet,
        surface: formData.surface,
        description: formData.description,
        adresse: formData.adresse,
        ville: formData.ville,
        codePostal: formData.codePostal,
        disponibilite: formData.disponibilite,
        photos: photoUrls,
        status: 'en_attente',
        createdAt: serverTimestamp(),
        userId: currentUser.uid,
        userEmail: currentUser.email
      };

      // Créer le devis dans la collection principale
      const devisRef = await addDoc(collection(db, 'devis'), devisData);
      
      // Créer une référence dans la sous-collection de l'utilisateur
      await setDoc(doc(db, 'users', currentUser.uid, 'devis', devisRef.id), {
        ...devisData,
        mainDevisId: devisRef.id // Référence vers le document principal
      });

      setSuccess(true);
      // Réinitialiser le formulaire
      setFormData({
        typeProjet: '',
        surface: '',
        description: '',
        adresse: '',
        ville: '',
        codePostal: '',
        disponibilite: '',
        photos: []
      });
      
      // Rediriger vers le dashboard après 2 secondes
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      console.error('Erreur lors de la soumission du devis:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'envoi du devis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="devis-particulier-container">
      <h1>Demande de devis pour particulier</h1>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Votre demande de devis a été envoyée avec succès ! Redirection en cours...</div>}
      <form onSubmit={handleSubmit} className="devis-form">
        <div className="form-group">
          <label htmlFor="typeProjet">Type de projet *</label>
          <select
            id="typeProjet"
            name="typeProjet"
            value={formData.typeProjet}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Sélectionner le type de projet</option>
            <option value="etancheite_toiture">Étanchéité toiture</option>
            <option value="etancheite_terrasse">Étanchéité terrasse</option>
            <option value="mur_enterre">Mur enterré</option>
            <option value="garde_corps">Garde corps</option>
            <option value="couvertine">Couvertine</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="surface">Surface approximative (m²) *</label>
          <input
            type="number"
            id="surface"
            name="surface"
            value={formData.surface}
            onChange={handleChange}
            required
            placeholder="Ex: 50"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description du projet *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Décrivez votre projet et les problèmes rencontrés..."
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="adresse">Adresse *</label>
          <input
            type="text"
            id="adresse"
            name="adresse"
            value={formData.adresse}
            onChange={handleChange}
            required
            placeholder="Numéro et nom de rue"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ville">Ville *</label>
            <input
              type="text"
              id="ville"
              name="ville"
              value={formData.ville}
              onChange={handleChange}
              required
              placeholder="Ville"
            />
          </div>

          <div className="form-group">
            <label htmlFor="codePostal">Code postal *</label>
            <input
              type="text"
              id="codePostal"
              name="codePostal"
              value={formData.codePostal}
              onChange={handleChange}
              required
              placeholder="Code postal"
              pattern="[0-9]{5}"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="disponibilite">Disponibilité souhaitée</label>
          <input
            type="text"
            id="disponibilite"
            name="disponibilite"
            value={formData.disponibilite}
            onChange={handleChange}
            placeholder="Ex: Après-midi en semaine, week-end..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="photos">Photos du projet (facultatif)</label>
          <input
            type="file"
            id="photos"
            name="photos"
            onChange={handleFileChange}
            multiple
            accept="image/*"
          />
          <small>Vous pouvez sélectionner plusieurs photos</small>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Envoi en cours...' : 'Envoyer la demande de devis'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DevisParticulier;
