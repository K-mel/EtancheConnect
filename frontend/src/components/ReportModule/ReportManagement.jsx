import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { sendAdminNotification } from '../../services/notificationService';
import './ReportManagement.css';

const ReportManagement = () => {
  const { currentUser } = useAuth();
  const [reportReason, setReportReason] = useState('');
  const [description, setDescription] = useState('');

  const submitReport = async (targetId, targetType) => {
    try {
      // Créer le signalement dans Firestore
      const reportData = {
        reporterId: currentUser.uid,
        targetId,
        targetType, // 'user', 'message', 'quote', etc.
        reason: reportReason,
        description,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const reportRef = await addDoc(collection(db, 'reports'), reportData);

      // Envoyer une notification aux administrateurs
      await sendAdminNotification('NEW_REPORT', {
        reportId: reportRef.id,
        reporterId: currentUser.uid,
        targetId,
        targetType,
        reason: reportReason
      });

      // Réinitialiser le formulaire
      setReportReason('');
      setDescription('');

      return reportRef;
    } catch (error) {
      console.error('Erreur lors de la création du signalement:', error);
      throw error;
    }
  };

  return (
    <div className="report-form">
      <h3>Signaler un problème</h3>
      <select 
        value={reportReason} 
        onChange={(e) => setReportReason(e.target.value)}
        required
      >
        <option value="">Sélectionnez une raison</option>
        <option value="inappropriate">Contenu inapproprié</option>
        <option value="spam">Spam</option>
        <option value="scam">Arnaque</option>
        <option value="harassment">Harcèlement</option>
        <option value="other">Autre</option>
      </select>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Décrivez le problème en détail..."
        required
      />

      <button 
        onClick={() => submitReport()} 
        disabled={!reportReason || !description}
      >
        Envoyer le signalement
      </button>
    </div>
  );
};

export default ReportManagement;
