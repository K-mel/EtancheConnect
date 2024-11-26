import React from 'react';
import './Terms.css';

const Terms = () => {
  return (
    <div className="terms">
      <div className="container">
        <h1>Conditions Générales de Vente</h1>
        
        <section>
          <h2>1. Objet</h2>
          <p>Les présentes Conditions Générales de Vente régissent l'utilisation du service de mise en relation proposé par EtancheConnect, plateforme en ligne permettant aux particuliers de trouver et de contacter des professionnels de l'étanchéité qualifiés, d'obtenir des devis et de procéder au paiement des prestations via notre plateforme sécurisée.</p>
        </section>

        <section>
          <h2>2. Description du Service</h2>
          <p>EtancheConnect propose :</p>
          <ul>
            <li>Une mise en relation entre particuliers et professionnels de l'étanchéité certifiés</li>
            <li>Un système de demande et de réception de devis en ligne</li>
            <li>Une messagerie intégrée pour la communication entre les parties</li>
            <li>Un système de paiement sécurisé</li>
            <li>Un espace personnel pour le suivi des projets</li>
          </ul>
        </section>

        <section>
          <h2>3. Inscription et Utilisation</h2>
          <p>L'utilisation de nos services nécessite la création d'un compte utilisateur. Les utilisateurs s'engagent à fournir des informations exactes et à les maintenir à jour. Deux types de comptes sont disponibles :</p>
          <ul>
            <li>Compte Particulier : pour les clients recherchant des services d'étanchéité</li>
            <li>Compte Professionnel : pour les artisans proposant leurs services</li>
          </ul>
        </section>

        <section>
          <h2>4. Tarification et Paiement</h2>
          <p>4.1 Pour les Particuliers :</p>
          <ul>
            <li>L'inscription et la demande de devis sont gratuites</li>
            <li>Le paiement des prestations s'effectue via notre plateforme sécurisée</li>
            <li>Les fonds sont sécurisés jusqu'à la validation des travaux</li>
          </ul>
          
          <p>4.2 Pour les Professionnels :</p>
          <ul>
            <li>Commission sur les prestations réalisées via la plateforme</li>
            <li>Paiement sécurisé et garantie de paiement</li>
          </ul>
        </section>

        <section>
          <h2>5. Garanties et Responsabilités</h2>
          <p>EtancheConnect s'engage à :</p>
          <ul>
            <li>Vérifier les certifications et qualifications des professionnels</li>
            <li>Sécuriser les transactions financières</li>
            <li>Assurer la protection des données personnelles</li>
            <li>Maintenir la plateforme accessible et fonctionnelle</li>
          </ul>
        </section>

        <section>
          <h2>6. Annulation et Remboursement</h2>
          <p>Les conditions d'annulation et de remboursement varient selon le stade du projet :</p>
          <ul>
            <li>Annulation avant acceptation du devis : sans frais</li>
            <li>Annulation après acceptation du devis : selon les conditions spécifiques du professionnel</li>
            <li>Litige : procédure de médiation disponible</li>
          </ul>
        </section>

        <section>
          <h2>7. Protection des Données</h2>
          <p>EtancheConnect s'engage à protéger les données personnelles conformément au RGPD. Les utilisateurs disposent d'un droit d'accès, de modification et de suppression de leurs données.</p>
        </section>

        <section>
          <h2>8. Modification des CGV</h2>
          <p>EtancheConnect se réserve le droit de modifier les présentes CGV. Les utilisateurs seront informés des modifications par email et/ou notification sur la plateforme.</p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>Pour toute question concernant ces CGV, vous pouvez nous contacter à :</p>
          <p>Email : contact@etancheconnect.fr<br />
          Téléphone : [Votre numéro]<br />
          Adresse : [Votre adresse]</p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
