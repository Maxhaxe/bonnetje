import { useState, useCallback } from 'react';
import { GEMINI_VISION_MODEL, GEMINI_TEXT_MODEL, buildReceiptPrompt, buildProductLinkPrompt } from '../utils/geminiPrompt.js';
import { resolveBestLink, buildSearchUrl } from '../utils/linkGenerator.js';
import { uid } from '../utils/formatters.js';
import { uploadReceiptImage } from '../utils/supabase.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1/models';

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    store: { type: 'string', description: 'Store name' },
    date: { type: 'string', description: 'YYYY-MM-DD' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name' },
          qty: { type: 'number' },
          unit_price: { type: 'number' },
          total_price: { type: 'number' },
          category: { type: 'string', enum: ['groceries', 'electronics', 'clothing', 'food', 'drink', 'health', 'household', 'other', 'unknown'] }
        },
        required: ['name', 'qty', 'unit_price', 'total_price']
      }
    },
    subtotal: { type: 'number' },
    discount: { type: 'number' },
    tax: { type: 'number' },
    total: { type: 'number' },
    payment_card: { type: 'string', description: 'Visa **** 1234' },
    payment_method: { type: 'string', enum: ['card', 'cash', 'contactless', 'unknown'] },
    currency: { type: 'string', description: 'EUR' },
    store_domain: { type: 'string', description: 'example.com' }
  },
  required: ['store', 'items', 'total', 'payment_method', 'currency']
};

const LINK_SCHEMA = {
  type: 'object',
  properties: {
    url: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    search_url: { type: 'string' }
  },
  required: ['confidence', 'search_url']
};

/**
 * Converts a File or Blob to base64.
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call Gemini text generation (for link prompts).
 */
async function geminiText(apiKey, prompt) {
  const url = `${GEMINI_API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { 
      temperature: 0.1, 
      maxOutputTokens: 1024
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';
  
  if (!text) {
    const reason = candidate?.finishReason || 'UNKNOWN';
    if (reason === 'SAFETY') {
      throw new Error('The request was blocked by safety filters.');
    }
    throw new Error(`Gemini returned an empty text response (Reason: ${reason}).`);
  }

  console.log('[Gemini Text Response]:', text);
  return text;
}

/**
 * Call Gemini Vision — send image + prompt.
 */
async function geminiVision(apiKey, imageBase64, mimeType, prompt) {
  const url = `${GEMINI_API_BASE}/${GEMINI_VISION_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: { 
      temperature: 0.1, 
      maxOutputTokens: 8192
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';
  
  if (!text) {
    const reason = candidate?.finishReason || 'UNKNOWN';
    if (reason === 'SAFETY') {
      throw new Error('The image was blocked by safety filters. Please try a different photo.');
    }
    throw new Error(`Gemini returned an empty response (Reason: ${reason}).`);
  }

  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('The receipt is too long and the response was truncated. Please try scanning a smaller section.');
  }

  console.log('[Gemini Vision Response]:', text);
  return text;
}

/**
 * Parse Gemini text response as JSON (handles code-fenced output).
 */
function parseJSON(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Received invalid or empty text from API.');
  }
  
  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[JSON Parse Error]:', e.message, 'Full Text:', text);
    
    // Fallback: search for first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const segment = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(segment);
      } catch (innerErr) {
        throw new Error(`JSON Syntax Error: ${innerErr.message}. The AI returned malformed data.`);
      }
    }
    throw new Error(`No valid JSON found. Error: ${e.message}`);
  }
}

export function useGemini(apiKey, useServerSideScanning = true) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Extract receipt data from an image file.
   * Returns a receipt object ready to store.
   */
  const extractReceipt = useCallback(async (imageFile) => {
    // If not using server-side, require API key on client
    if (!useServerSideScanning && !apiKey) throw new Error('No Gemini API key configured. Open Settings to add one.');
    
    setLoading(true);
    setError(null);

    try {
      const base64 = await fileToBase64(imageFile);
      const mimeType = imageFile.type || 'image/jpeg';
      let receiptData;

      if (useServerSideScanning) {
        // Send to our Cloudflare Pages API
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType,
            clientApiKey: apiKey // Provide it just in case the server needs a fallback
          })
        });

        if (!res.ok) {
          let errData;
          try { errData = await res.json(); } catch(e) {}
          throw new Error((errData && errData.error) || `Server error: ${res.status}`);
        }

        receiptData = await res.json();
      } else {
        // Client-side scanning (Legacy)
        const prompt = buildReceiptPrompt();
        const rawText = await geminiVision(apiKey, base64, mimeType, prompt);
        receiptData = parseJSON(rawText);

        // Generate product links for each item
        const items = await Promise.all(
          (receiptData.items || []).map(async (item) => {
            let link = null;
            try {
              if (apiKey) {
                  const linkPrompt = buildProductLinkPrompt(
                    item.name,
                    receiptData.store || '',
                    receiptData.store_domain || null,
                    item.id || null, // Article number from receipt
                  );
                  const linkText = await geminiText(apiKey, linkPrompt);
                  const linkData = parseJSON(linkText);
                  link = resolveBestLink(linkData, item.name, receiptData.store || '', receiptData.store_domain || null);
              }
            } catch {
              // Fallback silently
            }
            if (!link) {
              link = { url: buildSearchUrl(item.name, receiptData.store || ''), type: 'search' };
            }
            return { ...item, id: uid(), link };
          }),
        );
        receiptData.items = items;
      }

      // Try to upload to Supabase Storage permanently
      const publicUrl = await uploadReceiptImage(imageFile);
      const finalImageUrl = publicUrl || URL.createObjectURL(imageFile);

      return {
        id: receiptData.id || uid(),
        store: receiptData.store || 'Unknown Store',
        date: receiptData.date || null,
        items: receiptData.items || [],
        subtotal: receiptData.subtotal || 0,
        discount: receiptData.discount || 0,
        tax: receiptData.tax || 0,
        total: receiptData.total || 0,
        payment_card: receiptData.payment_card || null,
        payment_method: receiptData.payment_method || 'unknown',
        currency: receiptData.currency || 'EUR',
        store_domain: receiptData.store_domain || null,
        imageUrl: finalImageUrl,
        processedAt: new Date().toISOString(),
      };
    } catch (err) {
      let msg = err.message;
      if (msg.toLowerCase().includes('quota') || msg.includes('429')) {
        msg = "API Quota Exceeded. You have reached the free tier limit. Please check your API key or try again later.";
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiKey, useServerSideScanning]);

  return { extractReceipt, loading, error };
}
