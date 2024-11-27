// Expressions régulières pour détecter les informations sensibles
const PHONE_REGEX = /(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_REGEX = /(?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi;

export const validateMessageContent = (content) => {
  if (!content) return { isValid: false, error: 'Le message ne peut pas être vide.' };

  // Vérifier la présence de numéros de téléphone
  if (PHONE_REGEX.test(content)) {
    return {
      isValid: false,
      error: 'Le message ne doit pas contenir de numéro de téléphone.'
    };
  }

  // Vérifier la présence d'adresses email
  if (EMAIL_REGEX.test(content)) {
    return {
      isValid: false,
      error: 'Le message ne doit pas contenir d\'adresse email.'
    };
  }

  // Vérifier la présence d'URLs
  if (URL_REGEX.test(content)) {
    return {
      isValid: false,
      error: 'Le message ne doit pas contenir d\'URL ou de lien.'
    };
  }

  return { isValid: true };
};

export const sanitizeMessageContent = (content) => {
  if (!content) return '';
  
  // Remplacer les numéros de téléphone par [TÉLÉPHONE MASQUÉ]
  content = content.replace(PHONE_REGEX, '[TÉLÉPHONE MASQUÉ]');
  
  // Remplacer les emails par [EMAIL MASQUÉ]
  content = content.replace(EMAIL_REGEX, '[EMAIL MASQUÉ]');
  
  // Remplacer les URLs par [LIEN MASQUÉ]
  content = content.replace(URL_REGEX, '[LIEN MASQUÉ]');
  
  return content;
};
