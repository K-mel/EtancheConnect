import React from 'react';
import './LegalNotice.css';

const LegalNotice = () => {
  return (
    <div className="legal-notice">
      <div className="container">
        <h1>Mentions Légales</h1>
        
        <section>
          <h2>1. Informations légales</h2>
          <p>Le site EtancheConnect est édité par :</p>
          <p>EtancheConnect<br />
          [Votre adresse]<br />
          Email : contact@etancheconnect.fr<br />
          Téléphone : [Votre numéro]</p>
          <p>Directeur de la publication : [Votre nom]</p>
        </section>

        <section>
          <h2>2. Hébergement</h2>
          <p>Ce site est hébergé par :<br />
          [Nom de l'hébergeur]<br />
          [Adresse de l'hébergeur]</p>
        </section>

        <section>
          <h2>3. Propriété intellectuelle</h2>
          <p>L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés. La reproduction de tout ou partie de ce site sur quelque support que ce soit est formellement interdite sauf autorisation expresse d'EtancheConnect.</p>
        </section>

        <section>
          <h2>4. Protection des données personnelles</h2>
          <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant. Pour exercer ces droits, vous pouvez nous contacter à l'adresse : contact@etancheconnect.fr</p>
        </section>

        <section>
          <h2>5. Cookies</h2>
          <p>Notre site utilise des cookies pour améliorer votre expérience utilisateur. Vous pouvez paramétrer votre navigateur pour refuser les cookies, cependant, certaines fonctionnalités du site pourraient ne plus être accessibles.</p>
        </section>

        <section>
          <h2>6. Responsabilité</h2>
          <p>EtancheConnect met tout en œuvre pour offrir aux utilisateurs des informations et outils disponibles et vérifiés. Malgré tous les soins apportés, le site peut comporter des inexactitudes, des omissions ou des fichiers indisponibles.</p>
        </section>
      </div>
    </div>
  );
};

export default LegalNotice;
