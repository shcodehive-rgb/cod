/**
 * Order Validation Shield
 * ─────────────────────────────────────────────────────────────────────────────
 * Guards the order pipeline against fake COD leads, job seekers, and spam
 * before any Firestore write or CAPI event fires.
 *
 * Rules:
 *  1. Phone must be a valid Moroccan number (06/07 + 8 digits = 10 total)
 *  2. Message must not contain banned phrases (job inquiries, spam)
 */

// ─── Banned Phrases ────────────────────────────────────────────────────────────
// Strings that indicate the sender is NOT a customer placing an order.
// Matching is case-insensitive and bidirectional (Arabic + French/English).
const BANNED_PHRASES = [
  // Job seekers
  'livreur', 'travail', 'emploi', 'recrutement', 'candidature', 'cv',
  'job', 'hiring', 'driver', 'chauffeur',
  // Spam / irrelevant Arabic
  'عافاك', 'خدمة', 'عمل', 'توظيف', 'سائق', 'خدام', 'كنخدم',
  // Service solicitors
  'service', 'prestation', 'collaboration', 'partenariat', 'partnership',
  // Generic noise
  'test', 'essai', 'نجرب', 'تجربة',
];

// ─── Valid Moroccan Phone Regex ─────────────────────────────────────────────
// Accepts: 06XXXXXXXX or 07XXXXXXXX (exactly 10 digits, starting with 06/07)
// Also accepts already-formatted +212 numbers.
const MOROCCAN_PHONE_REGEX = /^(?:\+212|00212)?0?([67]\d{8})$/;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ─── Validators ────────────────────────────────────────────────────────────────

/**
 * Validates a Moroccan phone number.
 * Accepts local (06/07...) or international (+212...) formats.
 */
export function isValidMoroccanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().]/g, '');
  return MOROCCAN_PHONE_REGEX.test(cleaned);
}

/**
 * Checks whether any text field contains a banned phrase.
 * Returns the matched phrase if found, undefined otherwise.
 */
export function findBannedPhrase(texts: string[]): string | undefined {
  const combined = texts.join(' ').toLowerCase();
  return BANNED_PHRASES.find(phrase => combined.includes(phrase.toLowerCase()));
}

/**
 * Master validation function for an incoming WhatsApp order.
 * Returns { valid: false, reason } to silently drop the order,
 * or { valid: true } to allow the pipeline to proceed.
 */
export function validateWhatsAppOrder(params: {
  phone: string;
  customerName: string;
  messageBody: string;
  city?: string;
}): ValidationResult {
  const { phone, customerName, messageBody } = params;

  // ── 1. Phone Check ──────────────────────────────────────────────────────────
  if (!isValidMoroccanPhone(phone)) {
    return {
      valid: false,
      reason: `Invalid Moroccan phone: "${phone}" (must start with 06 or 07, 10 digits)`,
    };
  }

  // ── 2. Banned Phrase Check ──────────────────────────────────────────────────
  const matched = findBannedPhrase([customerName, messageBody]);
  if (matched) {
    return {
      valid: false,
      reason: `Banned phrase detected: "${matched}" — dropping as spam/job inquiry`,
    };
  }

  return { valid: true };
}
