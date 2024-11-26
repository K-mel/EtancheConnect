import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation/Navigation';
import Home from './components/Home/Home';
import Register from './components/Register/Register';
import Login from './components/Login/Login';
import Contact from './components/Contact/Contact';
import Dashboard from './components/Dashboard/Dashboard';
import ForgotPassword from './components/ForgotPassword/ForgotPassword';
import LegalNotice from './components/LegalNotice/LegalNotice';
import Terms from './components/Terms/Terms';
import Privacy from './components/Privacy/Privacy';
import About from './components/About/About';
import HowItWorks from './components/HowItWorks/HowItWorks';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/dashboard" element={<Dashboard userType="particulier" />} />
          <Route path="/dashboard/pro" element={<Dashboard userType="professionnel" />} />
          <Route path="/dashboard/admin" element={<Dashboard userType="admin" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/mentions-legales" element={<LegalNotice />} />
          <Route path="/cgv" element={<Terms />} />
          <Route path="/confidentialite" element={<Privacy />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
