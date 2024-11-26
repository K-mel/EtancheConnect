import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faShieldAlt, 
  faLock, 
  faCheckCircle, 
  faSearch, 
  faMoneyBillWave, 
  faHeadset, 
  faTrophy 
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import Footer from '../Footer/Footer';
import './Home.css';

const Home = () => {
  const { currentUser } = useAuth();

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-left">
            <h1>Votre solution d'étanchéité en un clic</h1>
            <p>Trouvez des experts certifiés pour protéger votre patrimoine</p>
            <div className="hero-cta">
              <Link to={currentUser ? "/devis/particulier" : "/register"} className="cta-button primary">Demander un devis gratuit</Link>
              <Link to="/how-it-works" className="cta-button secondary">Comment ça marche</Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">+500</span>
                <span className="stat-label">Professionnels</span>
              </div>
              <div className="stat">
                <span className="stat-number">95%</span>
                <span className="stat-label">Satisfaction</span>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-image-container">
              <img 
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80" 
                alt="Étanchéité professionnelle" 
                className="hero-image" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Protection Section */}
      <section className="protection-section">
        <div className="protection-content">
          <h2>Votre protection, notre priorité</h2>
          <div className="protection-features">
            <div className="feature">
              <div className="feature-icon">
                <FontAwesomeIcon icon={faShieldAlt} />
              </div>
              <h3>Professionnels certifiés</h3>
              <p>Chaque artisan est rigoureusement vérifié</p>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <FontAwesomeIcon icon={faLock} />
              </div>
              <h3>Paiement sécurisé</h3>
              <p>Transactions 100% protégées</p>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <FontAwesomeIcon icon={faCheckCircle} />
              </div>
              <h3>Satisfaction garantie</h3>
              <p>Qualité et service sans compromis</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-us">
        <div className="section-header">
          <h2>Pourquoi EtancheConnect ?</h2>
          <p>La plateforme qui simplifie vos projets d'étanchéité</p>
        </div>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">
              <FontAwesomeIcon icon={faSearch} />
            </div>
            <h3>Expertise Vérifiée</h3>
            <p>Des professionnels sélectionnés avec rigueur</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <FontAwesomeIcon icon={faMoneyBillWave} />
            </div>
            <h3>Prix Transparents</h3>
            <p>Devis détaillés sans frais cachés</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <FontAwesomeIcon icon={faHeadset} />
            </div>
            <h3>Support Dédié</h3>
            <p>Une équipe à votre écoute 7j/7</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <FontAwesomeIcon icon={faTrophy} />
            </div>
            <h3>Qualité Garantie</h3>
            <p>Travaux suivis et 100% satisfaits</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="section-header">
          <h2>Ils nous font confiance</h2>
          <p>Des avis authentiques de nos clients</p>
        </div>
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <p>"Rapide, professionnel et efficace. Je recommande !"</p>
            <div className="testimonial-author">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80" alt="Client" />
              <span>Marie D.</span>
            </div>
          </div>
          <div className="testimonial-card">
            <p>"Un service qui change vraiment la donne pour les travaux d'étanchéité."</p>
            <div className="testimonial-author">
              <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80" alt="Client" />
              <span>Jean P.</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
