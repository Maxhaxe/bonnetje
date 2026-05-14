/**
 * Format a number as currency.
 */
export function formatCurrency(amount, currency = 'EUR') {
  if (amount == null || isNaN(amount)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string nicely.
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  try {
    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/**
 * Generate a unique ID.
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Detect card network from card string.
 */
export function detectCardNetwork(cardStr) {
  if (!cardStr) return 'unknown';
  const s = cardStr.toLowerCase();
  if (s.includes('visa')) return 'visa';
  if (s.includes('master') || s.includes('mc')) return 'mastercard';
  if (s.includes('amex') || s.includes('american')) return 'amex';
  if (s.includes('maestro')) return 'maestro';
  if (s.includes('cash') || s.includes('contant')) return 'cash';
  if (s.includes('ideal') || s.includes('ideal')) return 'ideal';
  if (s.includes('paypal')) return 'paypal';
  return 'card';
}

/**
 * Get a color accent for a card network.
 */
export function cardNetworkColor(network) {
  const map = {
    visa: '#1a1f71',
    mastercard: '#eb001b',
    amex: '#007bc1',
    maestro: '#6f6f6f',
    cash: '#00c896',
    ideal: '#cc0066',
    paypal: '#003087',
    card: '#6c63ff',
    unknown: '#6c63ff',
  };
  return map[network] || '#6c63ff';
}

/**
 * Truncate a string to maxLen characters.
 */
export function truncate(str, maxLen = 40) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Category emoji mapping.
 */
export function categoryEmoji(cat) {
  const map = {
    groceries: '🛒',
    electronics: '💻',
    clothing: '👕',
    food: '🍔',
    drink: '☕',
    health: '💊',
    household: '🏠',
    other: '📦',
  };
  return map[cat] || '📦';
}
