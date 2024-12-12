import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../../firebase';
import './Signup.css';

const ACTIVITY_SECTORS = [
  'Étanchéité des toitures',
  'Étanchéité des murs enterrés',
  'Installation de garde-corps',
  'Pose de lanternaux',
  'Autres'
];

const WORKING_AREAS = [
  'Régionale (PACA uniquement)',
  'Nationale'
];

const SignupProfessionnel = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  
  const [formData, setFormData] = useState({
    // Informations générales
    companyName: '',
    siret: '',
    legalStatus: '',
    streetAddress: '',
    postalCode: '',
    city: '',
    sectors: [], 
    otherSector: '',

    // Coordonnées du responsable
    displayName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',

    // Informations bancaires
    bankName: '',
    iban: '',
    bic: '',

    // Documents
    idCard: null,
    kbis: null,
    insurance: null,

    // Conditions de prestation
    ratePerMeter: '',
    averageDelay: '',
    workingArea: '',
    serviceDescription: '',

    // Politique de paiements
    acceptTerms: false
  });

  const [documents, setDocuments] = useState({
    idCard: null,
    kbis: null,
    insurance: null
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setDocuments(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else if (type === 'checkbox') {
      if (name === 'sectors') {
        setFormData(prev => {
          const updatedSectors = prev.sectors ? [...prev.sectors] : [];
          if (checked) {
            updatedSectors.push(value);
          } else {
            const index = updatedSectors.indexOf(value);
            if (index > -1) {
              updatedSectors.splice(index, 1);
            }
          }
          return {
            ...prev,
            sectors: updatedSectors
          };
        });
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const uploadDocument = async (file, path) => {
    if (!file) return null;
    
    try {
      const timestamp = Date.now();
      const fileName = `${path}_${timestamp}`;
      const storageRef = ref(storage, `temp_uploads/${fileName}`);
      
      // Upload du fichier
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      return {
        url,
        path: `temp_uploads/${fileName}`,
        fileName: `${fileName}.${file.name.split('.').pop()}`,
        contentType: file.type,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      throw new Error(`Erreur lors de l'upload du document ${path}`);
    }
  };

  const validateStep = (currentStep) => {
    setError('');
    switch (currentStep) {
      case 1:
        if (!formData.companyName || !formData.siret) {
          setError('Veuillez remplir tous les champs obligatoires');
          return false;
        }
        break;
      case 2:
        if (!formData.displayName || !formData.phone || !formData.email) {
          setError('Veuillez remplir tous les champs obligatoires');
          return false;
        }
        break;
      case 3:
        if (!formData.bankName || !formData.iban || !formData.bic) {
          setError('Veuillez remplir tous les champs obligatoires');
          return false;
        }
        break;
      case 4:
        if (!documents.idCard || !documents.kbis || !documents.insurance) {
          setError('Veuillez télécharger tous les documents obligatoires');
          return false;
        }
        break;
      default:
        return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const cleanFormData = (data) => {
    // Fonction pour nettoyer une chaîne
    const cleanString = (str) => str ? str.trim() : '';
    
    // Fonction pour nettoyer un nombre
    const cleanNumber = (num) => {
      if (!num) return '';
      const cleaned = num.toString().replace(/[^\d.]/g, '');
      return cleaned || '';
    };

    // Nettoyer les données de base
    const cleaned = {
      companyName: cleanString(data.companyName),
      siret: cleanString(data.siret).replace(/\s/g, ''),
      email: cleanString(data.email),
      phone: cleanNumber(data.phone),
      password: data.password,
      legalStatus: cleanString(data.legalStatus),
      bankName: cleanString(data.bankName),
      iban: cleanString(data.iban),
      bic: cleanString(data.bic)
    };

    // Nettoyer les champs numériques
    if (data.ratePerMeter) cleaned.ratePerMeter = cleanNumber(data.ratePerMeter);
    if (data.averageDelay) cleaned.averageDelay = cleanNumber(data.averageDelay);

    // Ajouter les champs optionnels s'ils existent
    if (data.serviceDescription) cleaned.serviceDescription = cleanString(data.serviceDescription);
    if (data.sectors) cleaned.sectors = Array.isArray(data.sectors) ? data.sectors : [];
    if (data.workingArea) cleaned.workingArea = cleanString(data.workingArea);

    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    try {
      setError('');
      setLoading(true);

      // 1. Vérifier les champs obligatoires dans le formulaire brut
      const requiredFields = [
        'companyName',
        'siret',
        'email',
        'password',
        'phone',
        'legalStatus',
        'streetAddress',
        'postalCode',
        'city'
      ];

      const missingFields = requiredFields.filter(field => !formData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Champs obligatoires manquants : ${missingFields.join(', ')}`);
      }

      // 2. Vérifier les documents requis
      const requiredDocs = ['idCard', 'kbis', 'insurance'];
      const missingDocs = requiredDocs.filter(doc => !documents[doc]);
      if (missingDocs.length > 0) {
        throw new Error(`Documents manquants : ${missingDocs.join(', ')}`);
      }

      // 3. Upload des documents
      const uploadedDocs = {};
      for (const [key, file] of Object.entries(documents)) {
        if (file) {
          uploadedDocs[key] = await uploadDocument(file, key);
        }
      }

      // 4. Nettoyer les données
      const cleanedFormData = cleanFormData(formData);

      // 5. Préparer les données finales
      const userData = {
        companyName: cleanedFormData.companyName,
        siret: cleanedFormData.siret,
        email: cleanedFormData.email,
        phone: cleanedFormData.phone,
        password: cleanedFormData.password,
        legalStatus: cleanedFormData.legalStatus,
        displayName: cleanedFormData.companyName,
        type: 'professionnel',
        status: 'pending',
        createdAt: new Date().toISOString(),
        acceptTerms: true,
        documents: uploadedDocs,
        // Données structurées
        address: {
          street: formData.streetAddress,
          postalCode: formData.postalCode,
          city: formData.city
        },
        rates: {
          ratePerMeter: cleanedFormData.ratePerMeter || '',
          averageDelay: cleanedFormData.averageDelay || ''
        },
        // Champs optionnels
        bankName: cleanedFormData.bankName || '',
        iban: cleanedFormData.iban || '',
        bic: cleanedFormData.bic || '',
        serviceDescription: cleanedFormData.serviceDescription || '',
        sectors: Array.isArray(formData.sectors) ? formData.sectors : [],
        workingArea: cleanedFormData.workingArea || 'Régionale (PACA uniquement)'
      };

      // 6. Création du compte
      console.log('Données nettoyées envoyées:', userData);
      const result = await register(userData.email, userData.password, 'professionnel', userData);

      if (result && result.user) {
        setShowSummary(true);
      } else {
        throw new Error("Erreur lors de la création du compte");
      }
    } catch (err) {
      console.error('Erreur détaillée:', err);
      setError(err.message || "Une erreur s'est produite lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  if (showSummary) {
    return (
      <div className="signup-success">
        <h2>Merci pour votre inscription !</h2>
        <p>Nous vérifierons vos informations et activerons votre compte sous 48 heures. 
           Vous serez averti par e-mail une fois votre profil validé.</p>
      </div>
    );
  }

  return (
    <div className="signup-container">
      <div className="signup-form">
        <h2>Inscription Professionnel</h2>
        {error && <div className="alert alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div>
              <div className="form-group">
                <label>Nom de l'entreprise</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Numéro SIRET</label>
                <input
                  type="text"
                  name="siret"
                  value={formData.siret}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{14}"
                  title="Le numéro SIRET doit contenir 14 chiffres"
                />
              </div>

              <div className="form-group">
                <label>Statut juridique</label>
                <input
                  type="text"
                  name="legalStatus"
                  value={formData.legalStatus}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Code postal</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Ville</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Secteurs d'activité</label>
                <div className="sectors-grid">
                  {ACTIVITY_SECTORS.map((sector, index) => (
                    <div key={index} className="sector-item">
                      <input
                        type="checkbox"
                        name="sectors"
                        value={sector}
                        checked={Array.isArray(formData.sectors) && formData.sectors.includes(sector)}
                        onChange={handleChange}
                      />
                      <span>{sector}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Autre secteur</label>
                <input
                  type="text"
                  name="otherSector"
                  value={formData.otherSector}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="form-group">
                <label>Nom complet du responsable</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirmer le mot de passe</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="form-group">
                <label>Nom de la banque</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>IBAN</label>
                <input
                  type="text"
                  name="iban"
                  value={formData.iban}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>BIC</label>
                <input
                  type="text"
                  name="bic"
                  value={formData.bic}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="form-group">
                <label>Carte d'identité</label>
                <input
                  type="file"
                  name="idCard"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Kbis</label>
                <input
                  type="file"
                  name="kbis"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Assurance</label>
                <input
                  type="file"
                  name="insurance"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="form-group">
                <label>Tarif au mètre</label>
                <input
                  type="text"
                  name="ratePerMeter"
                  value={formData.ratePerMeter}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Délai moyen de réalisation</label>
                <input
                  type="text"
                  name="averageDelay"
                  value={formData.averageDelay}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Zone de travail</label>
                <select
                  name="workingArea"
                  value={formData.workingArea}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionnez une zone de travail</option>
                  {WORKING_AREAS.map((area, index) => (
                    <option key={index} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description du service</label>
                <textarea
                  name="serviceDescription"
                  value={formData.serviceDescription}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <div className="form-group">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  required
                />
                <span>J'accepte les conditions de paiement</span>
              </div>
            </div>
          )}

          <button type="button" onClick={handleBack} disabled={step === 1}>
            Précédent
          </button>

          <button type="button" onClick={handleNext} disabled={step === 6}>
            Suivant
          </button>

          {step === 6 && (
            <button type="submit" disabled={loading}>
              {loading ? 'Inscription en cours...' : 'S\'inscrire'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default SignupProfessionnel;
