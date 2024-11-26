import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3>À Propos d'EtancheConnect</h3>
                    <p>Votre plateforme de confiance pour tous vos besoins en étanchéité. Nous connectons les particuliers avec des professionnels qualifiés.</p>
                    <div className="social-links">
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><FaTwitter /></a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><FaLinkedinIn /></a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
                    </div>
                </div>

                <div className="footer-section">
                    <h3>Liens Rapides</h3>
                    <ul className="footer-links">
                        <li><Link to="/how-it-works">Comment ça marche</Link></li>
                        <li><Link to="/about">À propos</Link></li>
                        <li><Link to="/contact">Contact</Link></li>
                        <li><Link to="/register">S'inscrire</Link></li>
                        <li><Link to="/login">Se connecter</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Informations Légales</h3>
                    <ul className="footer-links">
                        <li><Link to="/mentions-legales">Mentions légales</Link></li>
                        <li><Link to="/cgv">CGV</Link></li>
                        <li><Link to="/confidentialite">Politique de confidentialité</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Contact</h3>
                    <p>Email: contact@etancheconnect.fr</p>
                    <p>Tél: +33 (0)1 23 45 67 89</p>
                    <p>Adresse: 123 Avenue de l'Étanchéité<br />75000 Paris, France</p>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} EtancheConnect. Tous droits réservés.</p>
            </div>
        </footer>
    );
};

export default Footer;
