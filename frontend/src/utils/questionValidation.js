// Fonction pour valider le contenu d'une question
export const validateQuestionContent = (content) => {
  // Regex pour détecter les numéros de téléphone (formats français)
  const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;
  
  // Regex pour détecter les emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  
  // Regex pour détecter les URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/;

  if (phoneRegex.test(content)) {
    return {
      isValid: false,
      error: "Les numéros de téléphone ne sont pas autorisés dans les questions."
    };
  }

  if (emailRegex.test(content)) {
    return {
      isValid: false,
      error: "Les adresses email ne sont pas autorisées dans les questions."
    };
  }

  if (urlRegex.test(content)) {
    return {
      isValid: false,
      error: "Les liens URL ne sont pas autorisés dans les questions."
    };
  }

  if (content.trim().length === 0) {
    return {
      isValid: false,
      error: "Veuillez entrer votre question"
    };
  }

  return {
    isValid: true,
    error: null
  };
};
