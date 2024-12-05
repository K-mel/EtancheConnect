import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { FaArrowLeft } from 'react-icons/fa';
import './ProfessionalQuoteForm.css';

const ProfessionalQuoteForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    siret: '',
    professionalName: '',
    professionalEmail: '',
    professionalPhone: '',
    clientName: '',
    workAddress: '',
    postalCode: '',
    city: '',
    clientEmail: '',
    workType: '',
    otherWorkType: '',
    workDescription: '',
    surfaceArea: '',
    specificMaterials: '',
    laborDetails: { description: '', quantity: '', unitPrice: '' },
    consumableMaterials: [{ description: '', quantity: '', unitPrice: '' }],
    nonConsumableMaterials: { description: '', quantity: '', unitPrice: '' },
    rgeStatus: false,
    quoteValidity: '30',
    startDelay: '15',
    cancellationTerms: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger les informations du professionnel
  useEffect(() => {
    const loadProfessionalData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData(prev => ({
            ...prev,
            companyName: userData.companyName || '',
            siret: userData.siret || '',
            professionalName: userData.displayName || '',
            professionalEmail: userData.email || '',
            professionalPhone: userData.phone || '',
            rgeStatus: userData.rgeStatus || false,
          }));
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données du professionnel:', err);
        setError('Erreur lors du chargement de vos informations');
      }
    };

    if (currentUser) {
      loadProfessionalData();
    }
  }, [currentUser]);

  // Fonction pour ajouter une nouvelle ligne de matériaux consommables
  const addConsumableMaterialLine = () => {
    setFormData(prev => ({
      ...prev,
      consumableMaterials: [
        ...prev.consumableMaterials,
        { description: '', quantity: '', unitPrice: '' }
      ]
    }));
  };

  // Fonction pour supprimer une ligne de matériaux consommables
  const removeConsumableMaterialLine = (index) => {
    setFormData(prev => ({
      ...prev,
      consumableMaterials: prev.consumableMaterials.filter((_, i) => i !== index)
    }));
  };

  // Fonction pour mettre à jour une ligne de matériaux consommables
  const handleConsumableMaterialChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      consumableMaterials: prev.consumableMaterials.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  // Calcul du total des matériaux consommables
  const calculateConsumableMaterialsTotal = () => {
    return formData.consumableMaterials.reduce((total, item) => {
      return total + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0));
    }, 0);
  };

  const calculateSubtotal = () => {
    const labor = (formData.laborDetails.quantity || 0) * (formData.laborDetails.unitPrice || 0);
    const consumable = calculateConsumableMaterialsTotal();
    const nonConsumable = (formData.nonConsumableMaterials.quantity || 0) * (formData.nonConsumableMaterials.unitPrice || 0);
    return labor + consumable + nonConsumable;
  };

  const calculateTVA = () => {
    return calculateSubtotal() * 0.10;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTVA();
  };

  const calculateDeposit = () => {
    return calculateTotal() * 0.30;
  };

  const calculateCommission = () => {
    return calculateDeposit() * 0.07;
  };

  const calculateClientTotal = () => {
    return calculateDeposit() + calculateCommission();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'number' ? parseFloat(value) || 0 : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const subtotal = calculateSubtotal();
      const tva = subtotal * 0.1; // TVA 10%
      const total = subtotal + tva;
      const deposit = total * 0.3; // Acompte 30%
      const commission = deposit * 0.07; // Commission plateforme 7%

      const quoteData = {
        ...formData,
        professionalId: currentUser.uid,
        subtotal,
        tva,
        total,
        deposit,
        commission,
        status: 'en_attente_validation',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'professionalQuotes'), quoteData);
      setSuccess('Devis envoyé avec succès !');
      setFormData({
        ...formData,
        workType: '',
        otherWorkType: '',
        workDescription: '',
        surfaceArea: '',
        specificMaterials: '',
        laborDetails: { description: '', quantity: '', unitPrice: '' },
        consumableMaterials: [{ description: '', quantity: '', unitPrice: '' }],
        nonConsumableMaterials: { description: '', quantity: '', unitPrice: '' },
      });
    } catch (err) {
      console.error('Erreur lors de l\'envoi du devis:', err);
      setError('Une erreur est survenue lors de l\'envoi du devis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="professional-quote-form">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <FaArrowLeft /> Retour
      </button>
      <h2>Créer un devis professionnel</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* Informations du professionnel */}
        <section className="form-section">
          <h3>Informations du professionnel</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nom de l'entreprise</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>SIRET</label>
              <input
                type="text"
                name="siret"
                value={formData.siret}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Nom du professionnel</label>
              <input
                type="text"
                name="professionalName"
                value={formData.professionalName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email professionnel</label>
              <input
                type="email"
                name="professionalEmail"
                value={formData.professionalEmail}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Téléphone professionnel</label>
              <input
                type="tel"
                name="professionalPhone"
                value={formData.professionalPhone}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </section>

        {/* Détails des travaux */}
        <section className="form-section">
          <h3>Détails des travaux</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Type de travaux</label>
              <select
                name="workType"
                value={formData.workType}
                onChange={handleInputChange}
                required
              >
                <option value="">Sélectionnez un type</option>
                <option value="etancheite_toiture">Étanchéité toiture</option>
                <option value="etancheite_terrasse">Étanchéité terrasse</option>
                <option value="etancheite_fondation">Étanchéité fondation</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            {formData.workType === 'autre' && (
              <div className="form-group">
                <label>Précisez le type de travaux</label>
                <input
                  type="text"
                  name="otherWorkType"
                  value={formData.otherWorkType}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}
            <div className="form-group full-width">
              <label>Description des travaux</label>
              <textarea
                name="workDescription"
                value={formData.workDescription}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Surface (m²)</label>
              <input
                type="number"
                name="surfaceArea"
                value={formData.surfaceArea}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </section>

        {/* Main d'œuvre et matériaux */}
        <section className="form-section">
          <h3>Main d'œuvre et matériaux</h3>
          
          {/* Main d'œuvre */}
          <div className="subsection">
            <h4>Main d'œuvre</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="laborDetails.description"
                  value={formData.laborDetails.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Quantité (heures)</label>
                <input
                  type="number"
                  name="laborDetails.quantity"
                  value={formData.laborDetails.quantity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Prix unitaire (€/h)</label>
                <input
                  type="number"
                  name="laborDetails.unitPrice"
                  value={formData.laborDetails.unitPrice}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Matériaux consommables */}
          <div className="subsection">
            <h4>Matériaux consommables</h4>
            {formData.consumableMaterials.map((material, index) => (
              <div key={index} className="material-line">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={material.description}
                      onChange={(e) => handleConsumableMaterialChange(index, 'description', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Quantité</label>
                    <input
                      type="number"
                      value={material.quantity}
                      onChange={(e) => handleConsumableMaterialChange(index, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Prix unitaire (€)</label>
                    <input
                      type="number"
                      value={material.unitPrice}
                      onChange={(e) => handleConsumableMaterialChange(index, 'unitPrice', e.target.value)}
                      required
                    />
                  </div>
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeConsumableMaterialLine(index)}
                    className="remove-line-button"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addConsumableMaterialLine}
              className="add-line-button"
            >
              Ajouter une ligne
            </button>
          </div>

          {/* Matériaux non consommables */}
          <div className="subsection">
            <h4>Matériaux non consommables</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="nonConsumableMaterials.description"
                  value={formData.nonConsumableMaterials.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Quantité</label>
                <input
                  type="number"
                  name="nonConsumableMaterials.quantity"
                  value={formData.nonConsumableMaterials.quantity}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Prix unitaire (€)</label>
                <input
                  type="number"
                  name="nonConsumableMaterials.unitPrice"
                  value={formData.nonConsumableMaterials.unitPrice}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Conditions et validité */}
        <section className="form-section">
          <h3>Conditions et validité</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Validité du devis (jours)</label>
              <input
                type="number"
                name="quoteValidity"
                value={formData.quoteValidity}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Délai de démarrage (jours)</label>
              <input
                type="number"
                name="startDelay"
                value={formData.startDelay}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Conditions d'annulation</label>
              <textarea
                name="cancellationTerms"
                value={formData.cancellationTerms}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </section>

        {/* Récapitulatif financier */}
        <section className="form-section">
          <h3>Récapitulatif financier</h3>
          <div className="financial-summary">
            <div className="summary-line">
              <span>Total HT</span>
              <span>{calculateSubtotal().toFixed(2)} €</span>
            </div>
            <div className="summary-line">
              <span>TVA (10%)</span>
              <span>{calculateTVA().toFixed(2)} €</span>
            </div>
            <div className="summary-line total">
              <span>Total TTC</span>
              <span>{calculateTotal().toFixed(2)} €</span>
            </div>
            <div className="summary-line">
              <span>Acompte (30%)</span>
              <span>{calculateDeposit().toFixed(2)} €</span>
            </div>
            <div className="summary-line">
              <span>Commission plateforme (7%)</span>
              <span>{calculateCommission().toFixed(2)} €</span>
            </div>
            <div className="summary-line total">
              <span>Total à payer par le client</span>
              <span>{calculateClientTotal().toFixed(2)} €</span>
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Envoi en cours...' : 'Envoyer le devis'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfessionalQuoteForm;
