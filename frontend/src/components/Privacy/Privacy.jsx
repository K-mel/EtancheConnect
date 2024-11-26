import React from 'react';
import './Privacy.css';

const Privacy = () => {
  return (
    <div className="privacy">
      <div className="container">
        <h1>Politique de Confidentialité</h1>
        
        <section>
          <h2>1. Introduction</h2>
          <p>Chez EtancheConnect, nous accordons une importance primordiale à la protection de vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations lors de l'utilisation de notre plateforme de mise en relation entre particuliers et professionnels de l'étanchéité.</p>
        </section>

        <section>
          <h2>2. Données Collectées</h2>
          <p>Nous collectons les informations suivantes :</p>
          <h3>2.1 Pour les Particuliers :</h3>
          <ul>
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone</li>
            <li>Adresse postale</li>
            <li>Détails des projets d'étanchéité</li>
            <li>Historique des devis et transactions</li>
          </ul>

          <h3>2.2 Pour les Professionnels :</h3>
          <ul>
            <li>Nom de l'entreprise</li>
            <li>SIRET</li>
            <li>Coordonnées professionnelles</li>
            <li>Certifications et qualifications</li>
            <li>Historique des prestations</li>
            <li>Informations bancaires (pour les paiements)</li>
          </ul>
        </section>

        <section>
          <h2>3. Utilisation des Données</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Faciliter la mise en relation entre particuliers et professionnels</li>
            <li>Traiter les demandes de devis</li>
            <li>Gérer les paiements sécurisés</li>
            <li>Améliorer nos services</li>
            <li>Assurer le suivi des projets</li>
            <li>Vous informer des mises à jour importantes</li>
          </ul>
        </section>

        <section>
          <h2>4. Protection des Données</h2>
          <p>Nous mettons en œuvre des mesures de sécurité robustes :</p>
          <ul>
            <li>Chiffrement SSL/TLS pour toutes les transmissions de données</li>
            <li>Stockage sécurisé sur des serveurs protégés</li>
            <li>Accès restreint aux données personnelles</li>
            <li>Surveillance continue des systèmes</li>
            <li>Mises à jour régulières des protocoles de sécurité</li>
          </ul>
        </section>

        <section>
          <h2>5. Sécurité des Paiements</h2>
          <p>La sécurité des transactions est assurée par :</p>
          <ul>
            <li>Utilisation de prestataires de paiement certifiés</li>
            <li>Protocoles de sécurité conformes aux normes PCI DSS</li>
            <li>Système de séquestre pour les paiements</li>
            <li>Vérification en deux étapes pour les transactions importantes</li>
            <li>Surveillance des transactions pour détecter les activités suspectes</li>
          </ul>
        </section>

        <section>
          <h2>6. Cookies et Traceurs</h2>
          <p>Nous utilisons des cookies pour :</p>
          <ul>
            <li>Améliorer la navigation sur le site</li>
            <li>Mémoriser vos préférences</li>
            <li>Analyser l'utilisation du site</li>
            <li>Sécuriser votre connexion</li>
          </ul>
          <p>Vous pouvez gérer vos préférences en matière de cookies via les paramètres de votre navigateur.</p>
        </section>

        <section>
          <h2>7. Vos Droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition au traitement</li>
            <li>Droit de limitation du traitement</li>
          </ul>
        </section>

        <section>
          <h2>8. Conservation des Données</h2>
          <p>Nous conservons vos données :</p>
          <ul>
            <li>Pendant la durée de votre utilisation active du service</li>
            <li>Selon les obligations légales en vigueur</li>
            <li>Jusqu'à votre demande de suppression</li>
          </ul>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>Pour toute question concernant vos données personnelles :</p>
          <p>Email : privacy@etancheconnect.fr<br />
          Délégué à la protection des données :<br />
          [Nom du DPO]<br />
          [Adresse]</p>
        </section>

        <section>
          <h2>10. Mises à Jour</h2>
          <p>Cette politique de confidentialité peut être mise à jour. La dernière version est toujours disponible sur notre site. Date de dernière mise à jour : [Date]</p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
