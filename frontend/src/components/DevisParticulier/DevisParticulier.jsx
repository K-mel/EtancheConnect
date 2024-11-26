import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DevisParticulier.css';

const DevisParticulier = () => {
  const navigate = useNavigate();
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
    // TODO: Implémenter la logique d'envoi du formulaire
    console.log('Formulaire soumis:', formData);
  };

  return (
    <div className="devis-particulier-container">
      <h1>Demande de devis pour particulier</h1>
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
            <option value="">Sélectionnez le type de projet</option>
            <option value="toiture">Étanchéité toiture</option>
            <option value="terrasse">Étanchéité terrasse</option>
            <option value="fondation">Étanchéité fondation</option>
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
          <button type="submit" className="submit-button">
            Envoyer la demande de devis
          </button>
        </div>
      </form>
    </div>
  );
};

export default DevisParticulier;
