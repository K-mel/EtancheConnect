import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { FaTools, FaCheck, FaClock } from 'react-icons/fa';

const ProjetsContent = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        const projectsData = projectsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des projets:', error);
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'en_cours':
        return <FaTools />;
      case 'termine':
        return <FaCheck />;
      case 'en_attente':
        return <FaClock />;
      default:
        return null;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'en_cours':
        return 'status-en-cours';
      case 'termine':
        return 'status-termine';
      case 'en_attente':
        return 'status-en-attente';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="loading">Chargement des projets...</div>;
  }

  return (
    <div className="project-grid">
      {projects.map(project => (
        <div key={project.id} className="project-card">
          <div className={`project-status ${getStatusClass(project.status)}`}>
            {getStatusIcon(project.status)} {project.status.replace('_', ' ')}
          </div>
          <h3>{project.title}</h3>
          <div className="project-details">
            <p><strong>Client:</strong> {project.clientName}</p>
            <p><strong>Date de début:</strong> {new Date(project.startDate).toLocaleDateString()}</p>
            {project.endDate && (
              <p><strong>Date de fin:</strong> {new Date(project.endDate).toLocaleDateString()}</p>
            )}
            <p><strong>Budget:</strong> {project.budget}€</p>
          </div>
          <div className="project-description">
            <p>{project.description}</p>
          </div>
          <div className="project-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${project.progress || 0}%` }}
              ></div>
            </div>
            <span>{project.progress || 0}% complété</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export { ProjetsContent };
