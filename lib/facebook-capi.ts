/**
 * Facebook Conversions API (CAPI) — Instant Purchase Event Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends a 'Purchase' event directly from the server to the Meta Graph API
 * at the exact moment a COD order is created — no status change required.
 *
 * All user data (phone, name) is SHA-256 hashed before transmission,
 * as required by Meta's data handling guidelines.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { createHash } from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CAPIOrderData {
  orderId: string;
  customerName: string;
  phone: string;         // Raw phone, e.g. +212xxxxxxxxx
  city?: string;
  sellingPrice: number;  // Revenue value in DH
  currency?: string;     // Defaults to 'MAD' (Moroccan Dirham)
  campaignId?: string;
  adId?: string;         // Specific Ad Creative ID from Facebook
  fbp?: string;          // Meta Browser ID (_fbp)
  fbc?: string;          // Meta Click ID (_fbc)
}

export interface CAPIResult {
  success: boolean;
  eventId?: string;
  error?: string;
  details?: any;
}

// ─── SHA-256 Hasher ───────────────────────────────────────────────────────────
function hash(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, ''); // Pure digits: "212688771251"
}

// ─── Core Function ────────────────────────────────────────────────────────────
/**
 * Sends an INSTANT server-side 'Purchase' event to the Meta Conversions API
 * at the exact moment the order lands in the database.
 *
 * @param orderData   - Details of the new order
 * @param pixelId     - Meta Pixel ID (from the linked campaign in Firestore)
 * @param accessToken - CAPI Access Token (from campaign or env)
 * @param clientIp    - Customer's IP address (optional, improves match quality)
 * @param userAgent   - Customer's browser User-Agent (optional, improves match quality)
 */
export async function sendInstantPurchaseEvent(
  orderData: CAPIOrderData,
  pixelId: string,
  accessToken: string,
  clientIp?: string,
  userAgent?: string,
  serverTimestamp?: Date, // Use actual server timestamp when available
): Promise<CAPIResult> {
  const endpoint = `https://graph.facebook.com/v19.0/${pixelId}/events`;

  // 1:1 Deduplication: Use the exact Firestore Document ID as the event_id.
  // This allows Meta to perfectly match this server event with the browser pixel event.
  const eventId = orderData.orderId;
  // CRITICAL: Use server timestamp for accurate event_time, fallback to current time
  const eventTime = serverTimestamp ? 
    Math.floor(serverTimestamp.getTime() / 1000) : 
    Math.floor(Date.now() / 1000); 

  // Advanced Matching: Split name into First (fn) and Last (ln) components
  const nameParts = (orderData.customerName || 'Unknown').trim().split(/\s+/);
  const firstName = nameParts[0] || 'unknown';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName; 

  // ─── Build the CAPI payload ──────────────────────────────────────────────
  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: eventTime,
        event_id: eventId,
        // "website" action_source tells Meta this came from a website interaction,
        // which gives it higher weight in the algorithm than "other".
        action_source: 'website',
        user_data: {
          // SHA-256 hashed PII — mandatory for CAPI data matching
          ph:  [hash(normalizePhone(orderData.phone))],
          fn:  [hash(firstName)],
          ln:  [hash(lastName)],
          ct:  orderData.city ? [hash(orderData.city.toLowerCase())] : undefined,
          country: [hash('ma')], // Morocco

          // Optional enrichment — pass when available for higher match quality score
          client_ip_address: clientIp  || undefined,
          client_user_agent: userAgent || undefined,
          fbc: orderData.fbc || undefined,
          fbp: orderData.fbp || undefined,
        },
        custom_data: {
          value:        orderData.sellingPrice,
          currency:     orderData.currency || 'MAD',
          order_id:     orderData.orderId,
          content_type: 'product',
          // Include specific ad creative ID for better optimization
          ...(orderData.adId && { ad_id: orderData.adId }),
        },
      },
    ],
    // ── Uncomment during testing in Events Manager → Test Events tab ──
    // test_event_code: 'TEST12345',
  };

  console.log(`\n🧠 [CAPI] ⚡ Instant Purchase event → Pixel ${pixelId}`);
  console.log(`   Order: ${orderData.orderId} | ${orderData.sellingPrice} MAD | ${orderData.phone}`);

  try {
    const response = await fetch(`${endpoint}?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errMsg = data.error?.message || JSON.stringify(data);
      console.error('❌ [CAPI] Meta API rejected the event:', errMsg);
      return { success: false, error: errMsg, details: data };
    }

    console.log(`✅ [CAPI] Meta accepted the event! Events received: ${data.events_received}`);
    return { success: true, eventId };

  } catch (err: any) {
    console.error('❌ [CAPI] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Status Change Purchase Event ─────────────────────────────────────────────
/**
 * Sends a Purchase event when order status changes to 'delivered' or 'confirmed'
 * Includes the specific Ad ID for creative-level optimization
 *
 * @param orderData   - Details of the order
 * @param pixelId     - Meta Pixel ID (from the linked campaign in Firestore)
 * @param accessToken - CAPI Access Token (from campaign or env)
 * @param clientIp    - Customer's IP address (optional, improves match quality)
 * @param userAgent   - Customer's browser User-Agent (optional, improves match quality)
 */
export async function sendStatusChangePurchaseEvent(
  orderData: CAPIOrderData,
  pixelId: string,
  accessToken: string,
  serverTimestamp?: Date, // Pass the actual server timestamp from Firestore
  clientIp?: string,
  userAgent?: string,
): Promise<CAPIResult> {
  // Use the same function but with status-specific logging
  console.log(`\n🧠 [CAPI] 🔄 Status Change Purchase event → Pixel ${pixelId}`);
  console.log(`   Order: ${orderData.orderId} | ${orderData.sellingPrice} MAD | ${orderData.phone}`);
  if (orderData.adId) {
    console.log(`   Ad Creative ID: ${orderData.adId} (for optimization)`);
  }

  return sendInstantPurchaseEvent(orderData, pixelId, accessToken, clientIp, userAgent, serverTimestamp);
}

// ─── Legacy alias (keep for backwards compatibility) ──────────────────────────
export const sendPurchaseEvent = sendInstantPurchaseEvent;
