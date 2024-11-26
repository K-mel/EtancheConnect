import React from 'react';
import './About.css';
import { FaHandshake, FaShieldAlt, FaUsers } from 'react-icons/fa';
import Footer from '../Footer/Footer';

const About = () => {
    return (
        <>
            <div className="about-container">
                <div className="about-header">
                    <h1>À Propos d'EtancheConnect</h1>
                    <p>Votre partenaire de confiance pour tous vos besoins en étanchéité</p>
                </div>

                <div className="about-grid">
                    <div className="about-card">
                        <h2>Notre Mission</h2>
                        <p>EtancheConnect a été créé avec une vision claire : simplifier la mise en relation entre les particuliers et les professionnels de l'étanchéité. Notre plateforme innovante permet aux propriétaires de trouver rapidement des experts qualifiés pour leurs projets d'étanchéité.</p>
                    </div>

                    <div className="about-card">
                        <h2>Notre Vision</h2>
                        <p>Nous aspirons à devenir la référence nationale en matière de services d'étanchéité, en offrant une plateforme transparente, efficace et sécurisée. Notre objectif est de révolutionner le secteur en le rendant plus accessible et professionnel.</p>
                    </div>

                    <div className="about-card">
                        <h2>Notre Engagement</h2>
                        <p>La qualité et la satisfaction client sont au cœur de nos préoccupations. Nous sélectionnons rigoureusement nos professionnels et garantissons un service optimal pour chaque projet d'étanchéité.</p>
                    </div>
                </div>

                <section className="about-values">
                    <div className="values-content">
                        <h2 className="text-center mb-4">Nos Valeurs</h2>
                        <div className="values-grid">
                            <div className="value-item">
                                <FaHandshake />
                                <h3>Confiance</h3>
                                <p>Nous construisons des relations durables basées sur la confiance et la transparence.</p>
                            </div>

                            <div className="value-item">
                                <FaShieldAlt />
                                <h3>Qualité</h3>
                                <p>Nous garantissons des services d'excellence et un professionnalisme irréprochable.</p>
                            </div>

                            <div className="value-item">
                                <FaUsers />
                                <h3>Satisfaction Client</h3>
                                <p>Votre satisfaction est notre priorité absolue à chaque étape de votre projet.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="team-section">
                    <h2 className="text-center">Notre Équipe</h2>
                    <div className="team-grid">
                        <div className="team-member">
                            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a" alt="Directeur" />
                            <h3>BENMOUSSA Camel</h3>
                            <p>Directeur Général</p>
                        </div>
                    </div>
                </section>
            </div>
            <Footer />
        </>
    );
};

export default About;
