import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaClock, FaHandshake, FaTools } from 'react-icons/fa';
import Footer from '../Footer/Footer';
import './HowItWorks.css';

const HowItWorks = () => {
    return (
        <>
            <div className="how-it-works-container">
                <div className="how-it-works-header">
                    <h1>Comment ça marche ?</h1>
                    <p>Découvrez comment EtancheConnect simplifie la mise en relation entre particuliers et professionnels de l'étanchéité en quelques étapes simples.</p>
                </div>

                <div className="steps-container">
                    <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h3>Créez votre compte</h3>
                            <p>Inscrivez-vous gratuitement en tant que particulier ou professionnel. Remplissez votre profil avec vos informations et vos besoins spécifiques en matière d'étanchéité.</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h3>Décrivez votre projet</h3>
                            <p>Pour les particuliers : détaillez votre projet d'étanchéité (type de surface, problème rencontré, photos, etc.).
                            Pour les professionnels : précisez vos domaines d'expertise et votre zone d'intervention.</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h3>Connectez-vous avec les professionnels</h3>
                            <p>Les particuliers reçoivent des propositions de professionnels qualifiés. Les professionnels accèdent aux projets correspondant à leur expertise dans leur zone géographique.</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                            <h3>Finalisez votre projet</h3>
                            <p>Échangez via notre messagerie sécurisée, planifiez des visites, recevez des devis détaillés et choisissez le professionnel qui vous convient le mieux.</p>
                        </div>
                    </div>
                </div>

                <section className="benefits-section">
                    <div className="benefits-content">
                        <h2 className="text-center">Les avantages EtancheConnect</h2>
                        <div className="benefits-grid">
                            <div className="benefit-card">
                                <FaShieldAlt />
                                <h3>Sécurité garantie</h3>
                                <p>Professionnels vérifiés et travaux garantis pour votre tranquillité.</p>
                            </div>

                            <div className="benefit-card">
                                <FaClock />
                                <h3>Gain de temps</h3>
                                <p>Trouvez rapidement le bon professionnel pour votre projet.</p>
                            </div>

                            <div className="benefit-card">
                                <FaHandshake />
                                <h3>Mise en relation efficace</h3>
                                <p>Communication directe et devis personnalisés.</p>
                            </div>

                            <div className="benefit-card">
                                <FaTools />
                                <h3>Expertise reconnue</h3>
                                <p>Des professionnels qualifiés pour des travaux de qualité.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="cta-section">
                    <h2>Prêt à démarrer votre projet ?</h2>
                    <p>Rejoignez EtancheConnect dès aujourd'hui et trouvez le professionnel idéal pour vos travaux d'étanchéité.</p>
                    <Link to="/register" className="cta-button">S'inscrire gratuitement</Link>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default HowItWorks;
