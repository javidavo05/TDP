/**
 * Utilidad para detectar y validar tipos de tarjetas de crédito
 */

export type CardType = "visa" | "mastercard" | "amex" | "discover" | "unknown";

/**
 * Detecta el tipo de tarjeta basado en el número BIN (Bank Identification Number)
 */
export function detectCardType(cardNumber: string): CardType {
  // Remover espacios y caracteres no numéricos
  const cleaned = cardNumber.replace(/\s+/g, "").replace(/\D/g, "");

  if (!cleaned) {
    return "unknown";
  }

  // Visa: empieza con 4
  if (/^4/.test(cleaned)) {
    return "visa";
  }

  // Mastercard: empieza con 5 o rango 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^2[2-7][2-7][0-9]/.test(cleaned)) {
    return "mastercard";
  }

  // Amex: empieza con 34 o 37
  if (/^3[47]/.test(cleaned)) {
    return "amex";
  }

  // Discover: empieza con 6011, 65, o rango 622126-622925
  if (
    /^6011/.test(cleaned) ||
    /^65/.test(cleaned) ||
    /^622(1[2-6]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-5])/.test(cleaned)
  ) {
    return "discover";
  }

  return "unknown";
}

/**
 * Formatea el número de tarjeta agregando espacios cada 4 dígitos
 * Amex tiene formato diferente: 4-6-5
 */
export function formatCardNumber(cardNumber: string): string {
  // Remover espacios existentes
  const cleaned = cardNumber.replace(/\s+/g, "").replace(/\D/g, "");

  if (!cleaned) {
    return "";
  }

  const cardType = detectCardType(cleaned);

  // Amex: formato 4-6-5 (ej: 3782 822463 10005)
  if (cardType === "amex") {
    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 10)} ${cleaned.slice(10, 15)}`;
    }
  }

  // Otras tarjetas: formato 4-4-4-4 (ej: 4532 1234 5678 9010)
  return cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
}

/**
 * Valida el número de tarjeta usando el algoritmo de Luhn
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s+/g, "").replace(/\D/g, "");

  if (!cleaned || cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  // Algoritmo de Luhn
  let sum = 0;
  let isEven = false;

  // Recorrer de derecha a izquierda
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Valida el formato de fecha de expiración (MM/YY)
 */
export function validateExpiryDate(expiry: string): boolean {
  const cleaned = expiry.replace(/\s+/g, "").replace(/\D/g, "");

  if (cleaned.length !== 4) {
    return false;
  }

  const month = parseInt(cleaned.slice(0, 2), 10);
  const year = parseInt(cleaned.slice(2, 4), 10);

  // Mes válido (01-12)
  if (month < 1 || month > 12) {
    return false;
  }

  // Año válido (no puede ser en el pasado)
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }

  return true;
}

/**
 * Valida el CVV (3 dígitos para Visa/Mastercard, 4 para Amex)
 */
export function validateCVV(cvv: string, cardType: CardType): boolean {
  const cleaned = cvv.replace(/\D/g, "");

  if (cardType === "amex") {
    return cleaned.length === 4;
  }

  return cleaned.length === 3;
}

/**
 * Obtiene el nombre legible del tipo de tarjeta
 */
export function getCardTypeName(cardType: CardType): string {
  const names: Record<CardType, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    unknown: "Tarjeta",
  };

  return names[cardType];
}

