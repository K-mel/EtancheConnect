// Firebase Auth error codes
export const ERROR_MESSAGES = {
  // Authentication errors
  'auth/email-already-in-use': 'Cette adresse email est déjà utilisée.',
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/operation-not-allowed': 'Opération non autorisée.',
  'auth/weak-password': 'Le mot de passe est trop faible.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/user-not-found': 'Aucun compte ne correspond à cette adresse email.',
  'auth/wrong-password': 'Mot de passe incorrect.',
  'auth/too-many-requests': 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
  'auth/network-request-failed': 'Erreur de connexion réseau.',

  // Firestore errors
  'permission-denied': 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.',
  'not-found': 'La ressource demandée n\'existe pas.',
  'already-exists': 'Cette ressource existe déjà.',
  'resource-exhausted': 'Quota dépassé. Veuillez réessayer plus tard.',
  'failed-precondition': 'Opération non valide dans l\'état actuel.',
  'aborted': 'L\'opération a été annulée.',
  'out-of-range': 'Opération en dehors des limites valides.',
  'unimplemented': 'Cette fonctionnalité n\'est pas encore disponible.',
  'internal': 'Erreur interne du serveur.',
  'unavailable': 'Service temporairement indisponible.',
  'data-loss': 'Données corrompues ou perdues.',
  'unauthenticated': 'Authentification requise pour effectuer cette action.',

  // Custom error codes
  'message-validation-failed': 'Le message contient du contenu non autorisé.',
  'upload-failed': 'Échec du téléchargement du fichier.',
  'invalid-file-type': 'Type de fichier non supporté.',
  'file-too-large': 'Le fichier est trop volumineux.',
  'missing-required-fields': 'Veuillez remplir tous les champs obligatoires.',
  'invalid-input': 'Les données saisies sont invalides.',
  'server-error': 'Une erreur est survenue sur le serveur.',
  'network-error': 'Erreur de connexion réseau.',
  'unknown-error': 'Une erreur inconnue est survenue.'
};
