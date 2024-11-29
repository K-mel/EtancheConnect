import React, { useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { createActivite } from '../../services/activitesService'; // Importez le service
import './MigrationTool.css';

const MigrationTool = () => {
  const [migrationStatus, setMigrationStatus] = useState('idle');
  const [stats, setStats] = useState({
    total: 0,
    updated: 0,
    skipped: 0
  });
  const [error, setError] = useState(null);

  const migrateDevis = async () => {
    try {
      setMigrationStatus('running');
      setError(null);
      
      // Récupérer tous les devis
      const devisSnapshot = await getDocs(collection(db, 'devis'));
      const total = devisSnapshot.size;
      let updated = 0;
      let skipped = 0;
      
      // Parcourir tous les devis
      for (const devisDoc of devisSnapshot.docs) {
        const devis = devisDoc.data();
        
        // Si le devis a déjà un professionalId, on le saute
        if (devis.professionalId) {
          skipped++;
          continue;
        }
        
        // Vérifier les différents champs possibles pour l'ID du professionnel
        const proId = devis.assignedPro || devis.proId;
        
        if (proId) {
          // Mettre à jour le devis avec le nouveau champ professionalId
          await updateDoc(doc(db, 'devis', devisDoc.id), {
            professionalId: proId,
            lastUpdated: new Date()
          });
          updated++;
        } else {
          skipped++;
        }

        // Mettre à jour les statistiques
        setStats({
          total,
          updated,
          skipped
        });
      }
      
      // Enregistrer l'activité de migration
      await createActivite(
        'migration', 
        'Migration des Devis', 
        `Migration terminée : ${updated} mis à jour, ${skipped} ignorés`, 
        { 
          total, 
          updated, 
          skipped 
        }
      );

      setMigrationStatus('completed');
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
      
      // Enregistrer l'erreur de migration comme une activité
      await createActivite(
        'erreur_migration', 
        'Échec de Migration', 
        `Erreur lors de la migration des devis : ${error.message}`,
        { errorDetails: error.toString() }
      );

      setError(error.message);
      setMigrationStatus('error');
    }
  };

  return (
    <div className="migration-tool">
      <h2>Outil de Migration des Devis</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="stats">
        <p>Total des devis : {stats.total}</p>
        <p>Devis mis à jour : {stats.updated}</p>
        <p>Devis ignorés : {stats.skipped}</p>
      </div>
      
      <button 
        onClick={migrateDevis}
        disabled={migrationStatus === 'running'}
        className="migration-button"
      >
        {migrationStatus === 'running' ? 'Migration en cours...' : 'Lancer la Migration'}
      </button>
      
      {migrationStatus === 'completed' && (
        <div className="success-message">
          Migration terminée avec succès !
        </div>
      )}
    </div>
  );
};

export default MigrationTool;
