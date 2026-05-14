/**
 * Generates product links for receipt items.
 * Strategy: use Gemini-suggested URL (if high/medium confidence), else fallback to search URL.
 */
export function buildSearchUrl(itemName, storeName) {
  const q = encodeURIComponent(`${itemName} ${storeName}`);
  return `https://www.google.com/search?q=${q}`;
}

export function buildStoreSearchUrl(itemName, storeDomain) {
  if (!storeDomain) return buildSearchUrl(itemName, '');
  const q = encodeURIComponent(itemName);
  return `https://www.google.com/search?q=${q}+site:${storeDomain}`;
}

/**
 * Given a Gemini link response, pick the best URL to display.
 */
export function resolveBestLink(geminiLinkResponse, itemName, storeName, storeDomain) {
  const { url, confidence, search_url } = geminiLinkResponse || {};

  // If we have a high-confidence direct URL, use it!
  if (url && confidence === 'high') {
    return { url, type: 'direct' };
  }

  // Fallback to search URL
  if (search_url) {
    return { url: search_url, type: 'search' };
  }
  
  return { url: buildStoreSearchUrl(itemName, storeDomain), type: 'search' };
}
