import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaClock, FaHandshake, FaTools } from 'react-icons/fa';
import Footer from '../Footer/Footer';
import './HowItWorks.css';

const steps = [
    {
        number: 1,
        title: "Inscription simplifiée",
        description: "Créez votre compte en quelques clics. Pour les particuliers : renseignez vos informations personnelles. Pour les professionnels : ajoutez vos certifications."
    },
    {
        number: 2,
        title: "Description détaillée",
        description: "Particuliers : décrivez votre projet et vos besoins. Professionnels : précisez vos spécialités et votre zone d'intervention."
    },
    {
        number: 3,
        title: "Mise en relation",
        description: "Notre algorithme connecte les particuliers avec les professionnels qualifiés de leur région. Recevez des devis et choisissez le professionnel qui vous convient."
    },
    {
        number: 4,
        title: "Paiement sécurisé",
        description: "Effectuez le paiement directement sur notre plateforme sécurisée. Les fonds sont débloqués uniquement une fois les travaux validés."
    }
];

const HowItWorks = () => {
    return (
        <div className="how-it-works-wrapper">
            <div className="how-it-works-container">
                <header className="how-it-works-header">
                    <h1>Comment ça marche ?</h1>
                    <p>EtancheConnect révolutionne la mise en relation entre particuliers et professionnels de l'étanchéité. Notre plateforme sécurisée et intuitive vous guide à chaque étape de votre projet, du premier contact jusqu'au paiement final.</p>
                </header>

                <section className="steps-section">
                    <div className="steps-content">
                        <div className="steps-grid">
                            {steps.map((step) => (
                                <div key={step.number} className="step-card">
                                    <div className="step-number">{step.number}</div>
                                    <h3 className="step-title">{step.title}</h3>
                                    <p className="step-description">{step.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="benefits-section">
                    <div className="benefits-content">
                        <h2>Les avantages EtancheConnect</h2>
                        <div className="benefits-grid">
                            <div className="benefit-card">
                                <FaShieldAlt />
                                <h3>Sécurité garantie</h3>
                                <p>Professionnels certifiés et paiements sécurisés avec garantie de satisfaction.</p>
                            </div>

                            <div className="benefit-card">
                                <FaClock />
                                <h3>Gain de temps</h3>
                                <p>Trouvez rapidement le bon professionnel ou des chantiers dans votre zone.</p>
                            </div>

                            <div className="benefit-card">
                                <FaHandshake />
                                <h3>Relation de confiance</h3>
                                <p>Communication directe et devis personnalisés.</p>
                            </div>

                            <div className="benefit-card">
                                <FaTools />
                                <h3>Expertise certifiée</h3>
                                <p>Des professionnels qualifiés pour vos travaux.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Prêt à démarrer ?</h2>
                    <p>Rejoignez EtancheConnect et trouvez le bon professionnel.</p>
                    <Link to="/register" className="cta-button">
                        Commencer gratuitement
                    </Link>
                </section>
            </div>
            <Footer />
        </div>
    );
};

export default HowItWorks;
