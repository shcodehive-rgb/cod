/**
 * WhatsApp Order Extractor
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans an incoming WhatsApp message body and attempts to extract order details.
 * All extraction is done with regex — no external NLP dependency required.
 *
 * Supported message formats (Moroccan market):
 *   - Phone: 06XXXXXXXX / 07XXXXXXXX / +2126XXXXXXXX / 00212...
 *   - Cities: Ozone Express official city list with intelligent matching
 *   - Name:  any 2–4 word capitalised sequence that isn't a city/keyword
 */

import { CityNormalizer } from './city-normalizer';

// ─── Moroccan city mapping (Alias/Arabic -> Canonical Ozone Name) ─────────────
const CITY_MAPPING: Record<string, string> = {
  'casablanca': 'Casablanca', 'casa': 'Casablanca', 'الدار البيضاء': 'Casablanca', 'dar bouazza': 'Dar Bouazza',
  'rabat': 'Rabat', 'الرباط': 'Rabat', 'temara': 'Temara', 'تمارة': 'Temara', 'sale': 'Sale', 'سلا': 'Sale',
  'marrakech': 'Marrakech', 'marrakesh': 'Marrakech', 'مراكش': 'Marrakech',
  'agadir': 'Agadir', 'أكادير': 'Agadir', 'ait melloul': 'Ait Melloul',
  'tanger': 'Tanger', 'tangier': 'Tanger', 'طنجة': 'Tanger',
  'fes': 'Fes', 'fez': 'Fes', 'فاس': 'Fes',
  'meknes': 'Meknes', 'meknès': 'Meknes', 'مكناس': 'Meknes',
  'oujda': 'Oujda', 'وجدة': 'Oujda',
  'kenitra': 'Kenitra', 'kénitra': 'Kenitra', 'القنيطرة': 'Kenitra',
  'tetouan': 'Tetouan', 'تطوان': 'Tetouan',
  'safi': 'Safi', 'آسفي': 'Safi',
  'el jadida': 'El Jadida', 'الجديدة': 'El Jadida',
  'nador': 'Nador', 'الناظور': 'Nador',
  'settat': 'Settat', 'سطات': 'Settat',
  'berrechid': 'Berrchid', 'المحمدية': 'Mohammedia',
  'bouskoura': 'Bouskoura', 'had soualem': 'Had Soualem',
};

const MOROCCO_CITIES = Object.keys(CITY_MAPPING);

// ─── Phone regex (Moroccan) ───────────────────────────────────────────────────
// Matches: 06..., 07..., +2126..., +2127..., 002126..., 002127...
const PHONE_REGEX =
  /(?:\+212|00212|0)([ .-]?)([67])(?:\d[ .-]?){8}/g;

// ─── Order-indicating keywords ────────────────────────────────────────────────
const ORDER_KEYWORDS = [
  'commande', 'commander', 'livraison', 'livrer', 'envoyer', 'colis', 'acheter', 'bghit', 'بغيت',
  'طلب', 'طلبية', 'اطلب', 'شراء', 'توصيل', 'مطلوب', 'عايز', 'عندي',
  'order', 'buy', 'purchase', 'deliver', 'send',
];

// ─── Product hint keywords ────────────────────────────────────────────────────
const PRODUCT_HINTS = [
  'robe', 'ensemble', 'djellaba', 'caftan', 'kaftan', 'chemise', 'pantalon',
  'veste', 'manteau', 'pull', 'hoodie', 'abaya', 'sac', 'chaussures', 'parfum',
  'قفطان', 'جلابة', 'عباية', 'قميص',
];

// ─── Greeting Exclusions ──────────────────────────────────────────────────────
const GREETINGS = [
  'سلام', 'السلام', 'مرحبا', 'أهلا', 'اهلا', 'salam', 'slm', 'hi', 'hello',
  'بخير', 'لاباس', 'لباس', 'خويا', 'ختي', 'عليكم', 'شكرا', 'الله', 'بارك',
];

// ─── Name Stop-words (Stop capturing name when these appear) ──────────────────
const NAME_STOP_WORDS = [
  'من', 'في', 'mn', 'f', 'fi', 'mne', 'man', 'dyal', 'dial',
];

export interface ExtractedOrder {
  customerName: string;
  phone: string;
  city: string;
  product: string;
  confidence: 'high' | 'medium' | 'low';
  shippingFee?: number;
  returnFee?: number;
  originalCity?: string;
}

/**
 * Strict Moroccan format: always +212XXXXXXXXX
 */
export function forceMoroccanFormat(raw: string): string {
  // Remove @s.whatsapp.net, @lid, etc.
  let clean = raw.split('@')[0];
  // Remove all non-digits
  let digits = clean.replace(/\D/g, '');
  
  // If it starts with 06/07, replace 0 with 212
  if (digits.startsWith('06') || digits.startsWith('07')) {
    digits = '212' + digits.slice(1);
  } 
  // If it's 9 digits starting with 6/7, add 212
  else if ((digits.startsWith('6') || digits.startsWith('7')) && digits.length === 9) {
    digits = '212' + digits;
  }
  // Handle 00212...
  else if (digits.startsWith('00212')) {
    digits = digits.slice(2);
  }
  
  // Enforce +212 prefix and ensure minimal length
  if (digits.length >= 9) {
    if (!digits.startsWith('212')) {
      // Fallback: if it's not Moroccan and not 212, don't force it to 212 
      // but the user wants STRICT MOROCCAN for this project.
      // So we'll assume it's Moroccan if it's 9–10 digits.
      if (digits.length <= 10) digits = '212' + digits.slice(-9);
    }
    return '+' + digits;
  }
  
  return '+' + digits; // Fallback
}

/**
 * Normalise a Moroccan phone number to strictly +212 format.
 */
export function normalisePhone(raw: string): string {
  return forceMoroccanFormat(raw);
}

/**
 * Try to find a Moroccan city name inside the message.
 * Uses CityNormalizer to match against the official Ozone city list.
 * Returns city match object with shipping fee information.
 */
function detectCity(text: string): { city: string; shippingFee?: number; returnFee?: number; originalCity?: string } {
  // First try the old mapping for backward compatibility
  const lower = text.toLowerCase();
  for (const [alias, canonical] of Object.entries(CITY_MAPPING)) {
    if (lower.includes(alias)) {
      // Try to get shipping info from Ozone list for the canonical name
      const ozoneMatch = CityNormalizer.normalizeCity(canonical);
      return {
        city: canonical,
        shippingFee: ozoneMatch?.shippingFee,
        returnFee: ozoneMatch?.returnFee,
        originalCity: alias
      };
    }
  }
  
  // If no match found, use the CityNormalizer for intelligent matching
  const cityMatch = CityNormalizer.normalizeCity(text);
  if (cityMatch && cityMatch.confidence > 0.6) {
    console.log(`🏙️ [CITY MATCHER] "${cityMatch.originalCity}" -> "${cityMatch.normalizedCity}" (confidence: ${Math.round(cityMatch.confidence * 100)}%)`);
    return {
      city: cityMatch.normalizedCity,
      shippingFee: cityMatch.shippingFee,
      returnFee: cityMatch.returnFee,
      originalCity: cityMatch.originalCity
    };
  }
  
  return { city: '' };
}

/**
 * Try to extract a proper name from the message.
 * Less strict version: returns the first 2 words that aren't cities or keywords.
 */
function detectName(text: string): string {
  const lower = text.toLowerCase();
  
  // ─── Rule 0: CRITICAL TRUNCATION (Stop at 'من', 'mn', 'f', etc.) ─────────────
  // This ensures that "Hassan mn Rabat" -> "Hassan"
  const stopWordsRegex = /\s+(?:mn|f|fi|mne|man|dyal|dial|من|في)\s+/i;
  const parts = text.split(stopWordsRegex);
  const truncText = parts[0].trim();

  // Rule 1: Look for explicit markers like "أنا" or "سمايتي"
  const markers = ['أنا', 'انا', 'سمايتي', 'إسمي', 'اسمي', 'سميتو', 'سميتي'];
  for (const marker of markers) {
    const regex = new RegExp(`${marker}\\s+([\\u0600-\\u06FF\\w]+(?:\\s+[\\u0600-\\u06FF\\w]+)?)`, 'i');
    const match = truncText.match(regex);
    if (match && match[1]) {
      const name = match[1].trim();
      if (!GREETINGS.includes(name.toLowerCase())) return name;
    }
  }

  // Rule 2: Fallback to word scanning with greeting filter
  const cleaned = truncText.replace(/[^\w\s\u0600-\u06FF]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
  const citySet = new Set(MOROCCO_CITIES.map(c => c.toLowerCase()));
  const keywordSet = new Set([...ORDER_KEYWORDS, ...PRODUCT_HINTS, ...GREETINGS, ...NAME_STOP_WORDS].map(k => k.toLowerCase()));

  const candidates: string[] = [];
  for (const w of words) {
    const lw = w.toLowerCase();
    
    // STOP if we hit a stop-word
    if (NAME_STOP_WORDS.includes(lw)) break;
    
    if (!citySet.has(lw) && !keywordSet.has(lw) && !/^\d+$/.test(w)) {
      candidates.push(w);
      if (candidates.length === 2) break;
    }
  }

  let finalName = candidates.join(' ');
  
  // ─── HARD POST-PROCESSING ───
  // Strictly truncate name if any stopword leaked through the previous rules
  finalName = finalName.split(/(?:\s+)(من|mn|في|f|dyal)(?:\s+|$)/i)[0].trim();
  finalName = finalName.replace(/\s+(من|mn|في|f|dyal)$/i, '').trim();

  return finalName;
}

/**
 * Detect product hints in the message.
 */
function detectProduct(text: string): string {
  const lower = text.toLowerCase();
  for (const hint of PRODUCT_HINTS) {
    if (lower.includes(hint)) {
      return hint.charAt(0).toUpperCase() + hint.slice(1) + ' (WhatsApp)';
    }
  }
  return 'Standard Product';
}

/**
 * Main extraction function.
 * Returns null if the message does NOT look like an order inquiry.
 */
export function extractOrderFromMessage(
  body: string,
  senderPhone: string,
): ExtractedOrder | null {
  console.log('🔍 [AI EXTRACTOR] TRIGGERED for text:', body.substring(0, 50) + (body.length > 50 ? '...' : ''));
  if (!body || body === '[media]') return null;

  const lowerBody = body.toLowerCase();
  const phoneMatches = body.match(PHONE_REGEX) ?? [];
  
  // EXTRACT FIELDS
  const cityResult = detectCity(body);
  const name = detectName(body);
  const product = detectProduct(body);

  // AGGRESSIVE TRIGGER:
  // If we found a city, we force an order creation even without a keyword.
  const hasKeyword = ORDER_KEYWORDS.some(k => lowerBody.includes(k.toLowerCase()));
  const isTriggered = !!cityResult.city || hasKeyword || phoneMatches.length > 0;

  if (!isTriggered) return null;

  // Phone preference: first number found in body, else sender phone
  const rawPhone = phoneMatches[0] ?? senderPhone;
  const phone = normalisePhone(rawPhone);

  // Confidence scoring (forced to high if city exists)
  let confidence: ExtractedOrder['confidence'] = 'low';
  if (cityResult.city && name) confidence = 'high';
  else if (cityResult.city || hasKeyword) confidence = 'medium';

  return {
    customerName: name || `WA Lead: ${phone}`,
    phone,
    city: cityResult.city || 'غير محدد',
    product,
    confidence,
    shippingFee: cityResult.shippingFee,
    returnFee: cityResult.returnFee,
    originalCity: cityResult.originalCity,
  };
}
