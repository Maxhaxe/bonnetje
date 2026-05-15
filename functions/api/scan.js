const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1/models';
const GEMINI_VISION_MODEL = 'gemini-2.5-flash';
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';

function buildReceiptPrompt() {
  return `You are an expert receipt parser. Extract the following information from the receipt image and return ONLY a valid JSON object. Do NOT wrap the JSON in Markdown formatting like \`\`\`json. Just return the raw JSON string.

Required JSON Structure:
{
  "store": "Name of the store (string)",
  "date": "Date of purchase in YYYY-MM-DD format (string, null if not found)",
  "items": [
    {
      "name": "Exact name of the product as on receipt (string)",
      "qty": "Quantity purchased (number)",
      "unit_price": "Price per unit (number)",
      "total_price": "Total price for this item row (number)",
      "category": "One of: groceries, electronics, clothing, food, drink, health, household, other, unknown (string)",
      "id": "Article number or ID if present (string, null if not found)"
    }
  ],
  "subtotal": "Subtotal amount before tax/discounts (number)",
  "discount": "Total discount amount (number, positive)",
  "tax": "Total tax amount (number)",
  "total": "Final total amount paid (number)",
  "payment_card": "Card number, e.g., 'Visa **** 1234' (string, null if cash/unknown)",
  "payment_method": "One of: card, cash, contactless, unknown (string)",
  "currency": "Currency code, e.g., 'EUR', 'USD' (string)",
  "store_domain": "Guess the website domain of the store, e.g., 'ah.nl' for Albert Heijn (string, null if unknown)"
}

Rules:
1. All prices must be numbers (e.g. 1.50).
2. If a field cannot be found, use null or 0 appropriately.
3. ONLY return valid JSON. No comments.`;
}

function buildProductLinkPrompt(productName, storeName, storeDomain, articleId) {
  return `You are a shopping assistant. I need to find the exact product URL for a receipt item.
Item Name: "${productName}"
Store Name: "${storeName}"
Store Domain: "${storeDomain || 'unknown'}"
Article ID: "${articleId || 'unknown'}"

Find the most likely direct product URL on the store's website. If you cannot confidently guess the direct URL, provide a search URL for the store.
Return ONLY a raw JSON object (no markdown, no quotes around the json).

Required JSON Structure:
{
  "url": "The direct product URL or search URL (string)",
  "confidence": "high, medium, or low (string)",
  "search_url": "A fallback search URL for this product on the store's website (string)"
}`;
}

function parseJSON(text) {
  const cleaned = text.trim();
  try { return JSON.parse(cleaned); } catch (e) {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1) return JSON.parse(cleaned.substring(first, last + 1));
    throw e;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  // Fallback to client provided key if server env key is missing (for local testing/transition)
  let apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

  try {
    const body = await request.json();
    const { imageBase64, mimeType, clientApiKey } = body;
    
    if (clientApiKey && !apiKey) {
      apiKey = clientApiKey;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server is missing Gemini API Key' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 data' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Scan Receipt Image
    const visionUrl = `${GEMINI_API_BASE}/${GEMINI_VISION_MODEL}:generateContent?key=${apiKey}`;
    const visionBody = {
      contents: [{ parts: [{ text: buildReceiptPrompt() }, { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    };
    
    const visionRes = await fetch(visionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(visionBody) });
    if (!visionRes.ok) throw new Error(`Gemini Vision Error: ${visionRes.statusText}`);
    const visionData = await visionRes.json();
    const receiptText = visionData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!receiptText) throw new Error('Empty response from Gemini Vision');
    
    const receiptJSON = parseJSON(receiptText);

    // 2. Generate Links for Items
    const itemsWithLinks = await Promise.all((receiptJSON.items || []).map(async (item) => {
      let link = null;
      try {
        const textUrl = `${GEMINI_API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;
        const textBody = {
          contents: [{ parts: [{ text: buildProductLinkPrompt(item.name, receiptJSON.store, receiptJSON.store_domain, item.id) }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        };
        const textRes = await fetch(textUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(textBody) });
        if (textRes.ok) {
          const textData = await textRes.json();
          const linkText = textData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (linkText) {
            const linkJSON = parseJSON(linkText);
            link = { url: linkJSON.url || linkJSON.search_url, type: linkJSON.confidence === 'high' ? 'direct' : 'search' };
          }
        }
      } catch (err) {
        console.error('Link gen error', err);
      }
      
      if (!link) link = { url: `https://www.google.com/search?q=${encodeURIComponent((receiptJSON.store || '') + ' ' + item.name)}`, type: 'search' };
      return { ...item, id: item.id || Math.random().toString(36).substring(7), link };
    }));

    receiptJSON.items = itemsWithLinks;
    receiptJSON.id = Math.random().toString(36).substring(7);

    return new Response(JSON.stringify(receiptJSON), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}
