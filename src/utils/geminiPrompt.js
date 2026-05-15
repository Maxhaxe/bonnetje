// Gemini Vision model (Gemini 2.0 Flash - Ultra fast)
export const GEMINI_VISION_MODEL = 'gemini-2.0-flash-exp';
// Gemini Text model (Gemini 2.0 Flash - Ultra fast)
export const GEMINI_TEXT_MODEL = 'gemini-2.0-flash-exp';

export function buildReceiptPrompt() {
  return `You are an expert, highly precise receipt parser. Analyze the provided receipt image carefully and extract all information. The image might be crumpled, blurry, or at an angle—use your best OCR capabilities to read the text.

Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with this exact structure:

{
  "store": "store name",
  "date": "YYYY-MM-DD or null",
  "items": [
    {
      "name": "product name",
      "id": "article number/EAN or null",
      "qty": 1,
      "unit_price": 0.00,
      "total_price": 0.00,
      "category": "groceries|electronics|clothing|food|drink|health|household|other"
    }
  ],
  "subtotal": 0.00,
  "discount": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "payment_card": "Visa **** 1234 or Cash or null",
  "payment_method": "card|cash|contactless|unknown",
  "currency": "EUR",
  "store_domain": "example.com or null"
}

Critical Rules for Extraction:
1. JSON Integrity: All strings MUST be properly JSON-escaped. 
2. Thoroughness: Extract EVERY single line item.
3. Article Numbers: Look closely for numeric codes next to or under product names (e.g., "309928", "wi12345"). These are extremely valuable—extract them into the "id" field of the item.
4. Math & Prices: All prices must be exact numbers.
5. Multilingual: Transcription must be exact.
6. Store Domain: Guess the official website domain.
7. Payment Info: Extract card type and last 4 digits.
8. Nulls: Use null if truly undetermined.
9. Currency: Infer from symbol.
10. Token Efficiency: Keep names concise but include brand.`;
}

export function buildProductLinkPrompt(itemName, storeName, storeDomain, articleNumber) {
  return `You are a product search expert. Generate a direct product URL or a high-accuracy search URL for this product:
Product: "${itemName}"
Article ID: "${articleNumber || 'unknown'}"
Store: "${storeName}"
Domain: "${storeDomain || 'unknown'}"

Return ONLY a JSON object:
{
  "url": "https://... or null",
  "confidence": "high|medium|low",
  "search_url": "https://..."
}

Rules for direct URLs:
- If store is Gamma and you have an article number, URL MUST be: https://www.gamma.nl/assortiment/p/B{article_number}
- If store is Albert Heijn (ah.nl) and you have a product ID, URL MUST be: https://www.ah.nl/producten/product/wi{id}
- For other stores, only provide a direct "url" if you are 100% sure. 

Rules for search_url:
- Always provide a search_url using site:${storeDomain} as a reliable backup.`;
}
