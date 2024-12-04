// Fonction pour formater les numéros de demande de devis
export const formatDevisNumber = (id) => {
  if (!id) return '';
  // Prend les 6 premiers caractères de l'ID et les convertit en majuscules
  const shortId = id.slice(0, 6).toUpperCase();
  // Ajoute le préfixe DEM- pour "Demande"
  return `DEM-${shortId}`;
};
