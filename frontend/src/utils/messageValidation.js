// Expressions régulières pour détecter les informations sensibles
const PHONE_REGEX = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;

export const validateMessageContent = (content) => {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      error: 'Le message est invalide.',
      sensitiveInfo: []
    };
  }

  const sensitiveInfo = [];
  let matches;

  // Vérifier les numéros de téléphone
  matches = content.match(PHONE_REGEX);
  if (matches) {
    sensitiveInfo.push({
      type: 'phone',
      matches: [...new Set(matches)] // Supprime les doublons
    });
  }

  // Vérifier les emails
  matches = content.match(EMAIL_REGEX);
  if (matches) {
    sensitiveInfo.push({
      type: 'email',
      matches: [...new Set(matches)]
    });
  }

  // Vérifier les URLs
  matches = content.match(URL_REGEX);
  if (matches) {
    sensitiveInfo.push({
      type: 'url',
      matches: [...new Set(matches)]
    });
  }

  if (sensitiveInfo.length > 0) {
    const errorDetails = sensitiveInfo.map(info => {
      const type = {
        'phone': 'numéro(s) de téléphone',
        'email': 'adresse(s) email',
        'url': 'lien(s) URL'
      }[info.type];
      return `${type} (${info.matches.length} trouvé${info.matches.length > 1 ? 's' : ''})`;
    }).join(', ');

    return {
      isValid: false,
      error: `Votre message contient des informations sensibles : ${errorDetails}. Pour votre sécurité, ces informations ne sont pas autorisées.`,
      sensitiveInfo
    };
  }

  return {
    isValid: true,
    error: null,
    sensitiveInfo: []
  };
};

export const sanitizeMessageContent = (content) => {
  if (!content || typeof content !== 'string') return '';

  // Remplacer les numéros de téléphone
  let sanitized = content.replace(PHONE_REGEX, '**numéro masqué**');
  
  // Remplacer les emails
  sanitized = sanitized.replace(EMAIL_REGEX, '**email masqué**');
  
  // Remplacer les URLs
  sanitized = sanitized.replace(URL_REGEX, '**lien masqué**');
  
  return sanitized;
};
