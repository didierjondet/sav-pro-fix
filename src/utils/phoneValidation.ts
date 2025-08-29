// Utilitaire de validation des numéros de téléphone français

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  message: string;
}

/**
 * Valide et formate un numéro de téléphone français
 * @param phoneNumber Le numéro à valider
 * @returns PhoneValidationResult
 */
export function validateFrenchPhoneNumber(phoneNumber: string): PhoneValidationResult {
  if (!phoneNumber || !phoneNumber.trim()) {
    return {
      isValid: true, // On permet les numéros vides
      formatted: '',
      message: ''
    };
  }

  // Nettoie le numéro (supprime espaces, tirets, parenthèses, points)
  const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
  
  // Vérification basique: doit contenir seulement des chiffres et éventuellement un +
  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return {
      isValid: false,
      formatted: phoneNumber,
      message: 'Le numéro ne doit contenir que des chiffres'
    };
  }

  // Cas 1: Numéro français standard (10 chiffres commençant par 0)
  if (/^0[1-9][0-9]{8}$/.test(cleaned)) {
    const formatted = cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5');
    return {
      isValid: true,
      formatted,
      message: 'Numéro français valide'
    };
  }

  // Cas 2: Numéro international français (+33 suivi de 9 chiffres)
  if (/^\+33[1-9][0-9]{8}$/.test(cleaned)) {
    const formatted = cleaned.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
    return {
      isValid: true,
      formatted,
      message: 'Numéro international français valide'
    };
  }

  // Cas 3: Numéro français sans le + (33 suivi de 9 chiffres)
  if (/^33[1-9][0-9]{8}$/.test(cleaned)) {
    const formatted = '+' + cleaned.replace(/(33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
    return {
      isValid: true,
      formatted,
      message: 'Numéro international français valide'
    };
  }

  // Cas 4: Numéro mobile français long (11 chiffres commençant par 0)
  // Parfois les gens ajoutent un chiffre en trop
  if (/^0[67][0-9]{9}$/.test(cleaned)) {
    // Tronquer à 10 chiffres
    const truncated = cleaned.substring(0, 10);
    const formatted = truncated.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5');
    return {
      isValid: true,
      formatted,
      message: 'Numéro mobile français (corrigé)'
    };
  }

  // Cas 5: Autres formats internationaux (on les accepte mais on avertit)
  if (cleaned.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 15) {
    return {
      isValid: true,
      formatted: phoneNumber,
      message: 'Format international accepté'
    };
  }

  // Numéro invalide
  let errorMessage = 'Format invalide. ';
  if (cleaned.length < 10) {
    errorMessage += 'Trop court (minimum 10 chiffres).';
  } else if (cleaned.length > 15) {
    errorMessage += 'Trop long (maximum 15 chiffres).';
  } else {
    errorMessage += 'Utilisez un format français (0X.XX.XX.XX.XX) ou international (+33 X XX XX XX XX).';
  }

  return {
    isValid: false,
    formatted: phoneNumber,
    message: errorMessage
  };
}

/**
 * Formate automatiquement un numéro pendant la saisie
 * @param value La valeur actuelle du champ
 * @returns La valeur formatée
 */
export function formatPhoneInput(value: string): string {
  // Supprime tous les caractères non numériques sauf le + au début
  let cleaned = value.replace(/[^\d+]/g, '');
  
  // S'assure que le + ne peut être qu'au début
  if (cleaned.includes('+')) {
    const plusIndex = cleaned.indexOf('+');
    if (plusIndex === 0) {
      cleaned = '+' + cleaned.substring(1).replace(/\+/g, '');
    } else {
      cleaned = cleaned.replace(/\+/g, '');
    }
  }
  
  // Formatage français automatique pour les numéros commençant par 0
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = cleaned.substring(0, 10); // Limite à 10 chiffres
    if (cleaned.length >= 2) {
      cleaned = cleaned.replace(/(\d{2})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/, (match, p1, p2, p3, p4, p5) => {
        let result = p1;
        if (p2) result += '.' + p2;
        if (p3) result += '.' + p3;
        if (p4) result += '.' + p4;
        if (p5) result += '.' + p5;
        return result;
      });
    }
  }
  
  return cleaned;
}