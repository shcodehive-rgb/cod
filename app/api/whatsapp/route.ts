import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  ConnectionState,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import Jimp from 'jimp';
import { extractOrderFromMessage, forceMoroccanFormat } from '@/lib/whatsapp-extractor';
import { OZONE_CITIES } from '@/data/cities';
import { sendInstantPurchaseEvent } from '@/lib/facebook-capi';
import { validateWhatsAppOrder } from '@/lib/order-validation';

/**
 * RESOLVE LID TO REAL NUMBER: Use Baileys in-memory store to find real phone number
 * This is the ONLY reliable way to get real numbers from @lid contacts
 */
function resolveLidToRealNumber(lid: string): string | null {
  console.log(`[LID RESOLVE] Looking up: ${lid}`);
  
  // Clean the LID - remove @lid if present
  const cleanLid = lid.includes('@lid') ? lid.split('@')[0] : lid;
  
  // 1. Primary: Check Baileys in-memory store contacts
  if (global._waStore && global._waStore.contacts) {
    // Try direct LID match
    let contact = global._waStore.contacts[cleanLid];
    if (contact && contact.id && contact.id.includes('@s.whatsapp.net')) {
      const realJid = contact.id;
      console.log(`[LID RESOLVE] Found in store: ${cleanLid} -> ${realJid}`);
      return realJid;
    }
    
    // Try with @lid suffix
    const lidWithSuffix = `${cleanLid}@lid`;
    contact = global._waStore.contacts[lidWithSuffix];
    if (contact && contact.id && contact.id.includes('@s.whatsapp.net')) {
      const realJid = contact.id;
      console.log(`[LID RESOLVE] Found in store (with @lid): ${lidWithSuffix} -> ${realJid}`);
      return realJid;
    }
    
    // Search all contacts for matching LID
    for (const [contactId, contactData] of Object.entries(global._waStore.contacts)) {
      if (contactData && 
          (contactData.lid === cleanLid || 
           contactData.lid === lidWithSuffix ||
           contactId === cleanLid ||
           contactId === lidWithSuffix) &&
          contactData.id && 
          contactData.id.includes('@s.whatsapp.net')) {
        const realJid = contactData.id;
        console.log(`[LID RESOLVE] Found by search: ${cleanLid} -> ${realJid}`);
        return realJid;
      }
    }
  }
  
  // 2. Fallback: Check memory map (less reliable)
  if (global._jidMap[cleanLid]) {
    const result = `${global._jidMap[cleanLid]}@s.whatsapp.net`;
    console.log(`[LID RESOLVE] Found in memory map: ${cleanLid} -> ${result}`);
    return result;
  }
  
  console.log(`[LID RESOLVE] NOT FOUND: ${cleanLid}`);
  return null;
}

/**
 * BLOCK ALL LIDs: Check if JID is internal LID that must be blocked
 */
function isLid(jid: string): boolean {
  return jid.includes('@lid') || 
         jid.startsWith('1196') || 
         jid.startsWith('4498') || 
         jid.startsWith('2260');
}

/**
 * DEEP SEARCH: Look for @s.whatsapp.net ID anywhere in the Baileys message payload
 */
function findRealJid(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === 'string' && val.endsWith('@s.whatsapp.net')) {
      return val;
    }
    if (typeof val === 'object' && val !== null) {
      const result = findRealJid(val);
      if (result) return result;
    }
  }
  return null;
}

// ── UTILITIES ───────────────────────────────────────────────────────────────

/**
 * Smart Phone Number Extractor for Moroccan numbers
 * Extracts phone numbers from message text with fallback to WhatsApp number
 */
function extractPhoneNumber(messageBody: string, whatsappNumber: string): string {
  // Moroccan phone number regex patterns
  const patterns = [
    // +212 format
    /(?:\+212|212)?\s*([6-7]\d{8})/g,
    // Local format: 06xxxxxxxx, 07xxxxxxxx, 05xxxxxxxx
    /(?:0)?([5-7]\d{8})/g,
    // Standalone 10-digit numbers starting with 5,6,7
    /\b([5-7]\d{8})\b/g
  ];

  // Try to find phone number in message
  for (const pattern of patterns) {
    const matches = messageBody.match(pattern);
    if (matches && matches.length > 0) {
      // Take the first match and clean it
      let extractedNumber = matches[0].replace(/\D/g, ''); // Remove all non-digits
      
      // Ensure it's a valid Moroccan number
      if (extractedNumber.length >= 9 && extractedNumber.length <= 12) {
        // Convert to standard format
        if (extractedNumber.startsWith('212')) {
          extractedNumber = extractedNumber.substring(3);
        }
        if (extractedNumber.startsWith('0')) {
          extractedNumber = extractedNumber.substring(1);
        }
        
        // Validate it starts with 5, 6, or 7 and has 9 digits
        if (/^[5-7]\d{8}$/.test(extractedNumber)) {
          console.log(`[PHONE EXTRACTOR] Found number in message: ${extractedNumber}`);
          return extractedNumber;
        }
      }
    }
  }

  // Fallback: Use WhatsApp number if no number found in message
  console.log(`[PHONE EXTRACTOR] No number found in message, using WhatsApp number: ${whatsappNumber}`);
  return whatsappNumber;
}

/**
 * Strips 'undefined' values recursively from any object or array
 * to prevent Firestore 'Value for argument "data" is not a valid Firestore document' errors.
 */
function sanitizeFirestoreData(data: any): any {
  return JSON.parse(JSON.stringify(data, (key, value) => (value === undefined ? null : value)));
}

async function uploadToImgBB(buffer: Buffer): Promise<string | null> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) return null;
  try {
    const image = await Jimp.read(buffer);
    await image.resize(600, Jimp.AUTO).quality(70);
    const compressedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    const formData = new FormData();
    formData.append('image', compressedBuffer.toString('base64'));
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
    const result = await response.json();
    return result.success ? result.data.display_url : null;
  } catch (err) { return null; }
}

// ─── Global Singleton with globalThis for Next.js HMR compatibility ──────────────────────────────────
// Use globalThis to preserve socket instance across hot module replacement
declare global {
  var _waSock: any;
  var _waQrCode: string;
  var _waStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'waiting';
  var _waConnecting: boolean;
  var _jidMap: Record<string, string>;
  var _waStore: {
    contacts: Record<string, { id?: string; lid?: string; [key: string]: any }>;
    bind: (ev: any) => void;
  };
  var _waSettings: {
    sellingPrice: number;
    productCost: number;
    shippingFee: number;
    packagingCost: number;
  };
}

// Initialize globalThis properties for HMR persistence
const initGlobalState = () => {
  if (!globalThis._waQrCode)      globalThis._waQrCode   = '';
  if (!globalThis._waStatus)      globalThis._waStatus   = 'idle';
  if (!globalThis._waSock)        globalThis._waSock     = null;
  if (!globalThis._waSettings) {
    globalThis._waSettings = { sellingPrice: 250, productCost: 50, shippingFee: 45, packagingCost: 5 };
  }
  if (!globalThis._jidMap)        globalThis._jidMap     = {};
  if (!globalThis._waConnecting)  globalThis._waConnecting = false;
};

// Initialize global state
initGlobalState();

// Proxy global variables to globalThis for backward compatibility
if (!global._waQrCode) global._waQrCode = globalThis._waQrCode;
if (!global._waStatus) global._waStatus = globalThis._waStatus;
if (!global._waSock) global._waSock = globalThis._waSock;
if (!global._waSettings) global._waSettings = globalThis._waSettings;
if (!global._jidMap) global._jidMap = globalThis._jidMap;
if (!global._waConnecting) global._waConnecting = globalThis._waConnecting;

// Sync all writes to globalThis
const syncToGlobalThis = () => {
  globalThis._waQrCode = global._waQrCode;
  globalThis._waStatus = global._waStatus;
  globalThis._waSock = global._waSock;
  globalThis._waSettings = global._waSettings;
  globalThis._jidMap = global._jidMap;
  globalThis._waConnecting = global._waConnecting;
};

// Initial sync
syncToGlobalThis();

const logger = pino({ level: 'silent' });
const AUTH_FOLDER = 'auth_info_baileys';
const STORE_FILE = 'baileys_store.json';
const ADMIN_JID = '212688771251@s.whatsapp.net';

// --- Initialize Simple In-Memory Store with globalThis persistence ---
if (!global._waStore) {
  global._waStore = {
    contacts: {} as Record<string, { id?: string; lid?: string; [key: string]: any }>,
    bind: (ev: any) => {
      // Simple event binding for contacts
      ev.on('contacts.upsert', (contacts: any) => {
        contacts.forEach((c: any) => {
          global._waStore.contacts[c.id] = c;
          globalThis._waStore = global._waStore; // Sync to globalThis
        });
      });
      ev.on('contacts.update', (updates: any) => {
        updates.forEach((u: any) => {
          if (global._waStore.contacts[u.id]) {
            Object.assign(global._waStore.contacts[u.id], u);
            globalThis._waStore = global._waStore; // Sync to globalThis
          }
        });
      });
    }
  };
  
  // Load persisted store if exists
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      // Restore contacts from file
      if (data.contacts) {
        Object.entries(data.contacts).forEach(([jid, contact]: [string, any]) => {
          global._waStore.contacts[jid] = contact;
        });
      }
      console.log('[STORE] Successfully loaded Baileys store from disk');
    }
  } catch (err) {
    console.error('[STORE] Load error:', err);
  }
  
  // Periodic Save
  setInterval(() => {
    try {
      const storeData = {
        contacts: global._waStore.contacts
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(storeData));
    } catch (err) {
      console.error('[STORE] Save error:', err);
    }
  }, 10_000);
  
  // Sync store to globalThis
  globalThis._waStore = global._waStore;
}

// ─── Connection Validation with Auto-Reconnect ────────────────────────────────────────
function isConnectionReady(): boolean {
  // Check both global and globalThis for HMR compatibility
  const sock = global._waSock || globalThis._waSock;
  const status = global._waStatus || globalThis._waStatus;
  return !!(sock && status === 'connected' && sock.user);
}

async function waitForConnection(timeoutMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (isConnectionReady()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

// ─── Auto-Reconnect Logic ────────────────────────────────────────────────────────
async function ensureConnection(): Promise<boolean> {
  console.log('[AUTO-RECONNECT] Checking connection status...');
  
  // Check if socket exists and is connected
  if (isConnectionReady()) {
    console.log('[AUTO-RECONNECT] Connection is ready');
    return true;
  }
  
  // Check if we're currently connecting
  const isConnecting = global._waConnecting || globalThis._waConnecting;
  if (isConnecting) {
    console.log('[AUTO-RECONNECT] Already connecting, waiting...');
    return await waitForConnection(10000);
  }
  
  // Try to reconnect if socket is dead
  console.log('[AUTO-RECONNECT] Socket is dead, attempting reconnection...');
  
  // Reset connection state
  global._waSock = null;
  globalThis._waSock = null;
  global._waStatus = 'idle';
  globalThis._waStatus = 'idle';
  global._waConnecting = false;
  globalThis._waConnecting = false;
  syncToGlobalThis();
  
  // Attempt to reconnect
  try {
    await connectToWhatsApp();
    const connected = await waitForConnection(15000);
    if (connected) {
      console.log('[AUTO-RECONNECT] Successfully reconnected');
      return true;
    } else {
      console.log('[AUTO-RECONNECT] Reconnection failed');
      return false;
    }
  } catch (error) {
    console.error('[AUTO-RECONNECT] Reconnection error:', error);
    return false;
  }
}

// ─── Session Health Check ────────────────────────────────────────────────────────
function checkSessionHealth(): { healthy: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check socket existence
  const sock = global._waSock || globalThis._waSock;
  if (!sock) {
    issues.push('Socket instance is null/undefined');
  }
  
  // Check connection status
  const status = global._waStatus || globalThis._waStatus;
  if (status !== 'connected') {
    issues.push(`Connection status is ${status}, expected 'connected'`);
  }
  
  // Check WebSocket state
  if (sock && sock.ws) {
    if (sock.ws.readyState !== 1) {
      const readyStateMap: Record<number, string> = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' };
      issues.push(`WebSocket state is ${readyStateMap[sock.ws.readyState] || sock.ws.readyState}`);
    }
  } else if (sock) {
    issues.push('Socket exists but WebSocket is missing');
  }
  
  // Check user authentication
  if (!sock?.user) {
    issues.push('Socket user is not authenticated');
  }
  
  // Check auth folder
  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      issues.push('Auth folder does not exist');
    } else {
      const authFiles = fs.readdirSync(AUTH_FOLDER);
      if (authFiles.length === 0) {
        issues.push('Auth folder is empty - no session files found');
      }
    }
  } catch (err: any) {
    issues.push(`Cannot access auth folder: ${err?.message || 'Unknown error'}`);
  }
  
  return {
    healthy: issues.length === 0,
    issues
  };
}

// ─── Enhanced Error Logging ────────────────────────────────────────────────────────
function logConnectionDetails(): void {
  const sock = global._waSock || globalThis._waSock;
  const status = global._waStatus || globalThis._waStatus;
  const connecting = global._waConnecting || globalThis._waConnecting;
  
  console.log('=== CONNECTION DEBUG INFO ===');
  console.log(`Socket exists: ${!!sock}`);
  console.log(`Socket type: ${typeof sock}`);
  console.log(`Connection status: ${status}`);
  console.log(`Is connecting: ${connecting}`);
  
  if (sock) {
    console.log(`WebSocket exists: ${!!sock.ws}`);
    console.log(`WebSocket readyState: ${sock.ws?.readyState}`);
    console.log(`User authenticated: ${!!sock.user}`);
    console.log(`User ID: ${sock.user?.id}`);
    console.log(`Socket ID: ${sock.id}`);
  }
  
  const health = checkSessionHealth();
  console.log(`Session healthy: ${health.healthy}`);
  if (!health.healthy) {
    console.log('Issues:', health.issues);
  }
  console.log('=== END DEBUG INFO ===');
}

// ─── 🤖 3-BOT HANDLERS ─────────────────────────────────────────────

/**
 * 🤖 BOT 1: The Receptionist - Customer Facing
 * Handles incoming customer messages and creates new leads
 */
async function handleBot1Receptionist(text: string, jid: string, msg: any) {
  console.log(`[BOT 1] Receptionist handling message from ${jid}: ${text}`);
  
  try {
    // Extract customer info from message
    const customerPhone = jid.split('@')[0];
    const extracted = extractOrderFromMessage(text, customerPhone);
    
    // Ask for Name and City if not provided
    let response = '';
    if (!extracted || !extracted.customerName) {
      response = '👋 Welcome! Please provide your name to continue.';
    } else if (!extracted.city) {
      response = `📍 Thank you ${extracted.customerName}! Please provide your city for delivery.`;
    } else {
      // Create new order document with auto-shipping fees
      const orderData = {
        customerName: extracted.customerName,
        phone: customerPhone,
        city: extracted.city,
        originalCity: extracted.originalCity,
        product: extracted.product || 'Standard Product',
        sellingPrice: 250, // Default price
        productCost: 100, // Default cost
        packagingCost: 5,
        shippingFee: extracted.shippingFee || 45, // Use extracted fee or default
        returnFee: extracted.returnFee || 15, // Use extracted fee or default
        status: 'pending',
        campaignSource: 'WhatsApp Organic',
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection('orders').add(sanitizeFirestoreData(orderData));
      console.log(`[BOT 1] Created order ${docRef.id} for ${customerPhone}`);

      // Notify Admin
      const notification = `🔔 New Lead: ${extracted.customerName} - ${extracted.city} - ${customerPhone}`;
      await global._waSock.sendMessage(ADMIN_JID, { text: notification });
      
      response = '✅ Thank you! Your order has been received and will be processed shortly.';
    }

    await global._waSock.sendMessage(jid, { text: response });
  } catch (error) {
    console.error('[BOT 1] Error:', error);
  }
}

/**
 * 🌐 BOT 3: The Tracker - Background Worker
 * Firestore listener for Facebook CAPI integration
 */
function setupBot3Tracker() {
  console.log('[BOT 3] Setting up Firestore listener for Facebook CAPI...');
  
  db.collection('orders').onSnapshot(async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'modified') {
        const orderData = change.doc.data();
        
        // Check if order has all required fields for CAPI
        if (orderData.customerName && 
            orderData.phone && 
            orderData.city && 
            orderData.sellingPrice && 
            orderData.productCost && 
            orderData.adId) {
          
          console.log(`[BOT 3] Triggering Facebook CAPI for order ${change.doc.id}`);
          
          // Send to Facebook Conversions API
          try {
            await sendInstantPurchaseEvent({
              orderId: change.doc.id,
              customerName: orderData.customerName,
              phone: orderData.phone,
              city: orderData.city,
              sellingPrice: orderData.sellingPrice,
              currency: 'MAD',
              // Use adId as campaignId for tracking
              campaignId: orderData.adId || '',
            }, process.env.META_PIXEL_ID || '', process.env.META_SYSTEM_USER_TOKEN || '');
            
            console.log(`[BOT 3] Facebook CAPI event sent for order ${change.doc.id}`);
          } catch (error) {
            console.error('[BOT 3] Facebook CAPI error:', error);
          }
        }
      }
    });
  });
}

/**
 * Helper: Extract phone number from quoted notification text
 */
function extractPhoneFromQuotedText(text: string): string | null {
  const match = text.match(/🔔 New Lead: (.+) - (.+) - (\+\d+)/);
  return match ? match[3] : null;
}

// ─── Core Connection Logic ──────────────────────────────────────────────────
async function connectToWhatsApp() {
  // Check both global and globalThis for existing socket
  const existingSock = global._waSock || globalThis._waSock;
  const isConnecting = global._waConnecting || globalThis._waConnecting;
  
  if (existingSock || isConnecting) {
    console.log('[CONNECTION] Already connecting or connected');
    return;
  }
  
  global._waConnecting = true;
  globalThis._waConnecting = true;
  syncToGlobalThis();
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger,
      browser: ['Sage', 'Chrome', '1.0.0'],
    });
    
    // Store socket in both global and globalThis
    global._waSock = sock;
    globalThis._waSock = sock;
    syncToGlobalThis();

    global._waSock.ev.on('creds.update', saveCreds);
    
    // Bind Store
    global._waStore.bind(global._waSock.ev);

    // --- CONTACT MAPPING (Real Phone from Device) ---
    const saveLidMap = async (lid: string, phone: string) => {
      if (!lid || !phone) return;
      global._jidMap[lid] = phone;
      try {
        await db.collection('system_settings').doc('lid_map').set({
          [lid]: phone
        }, { merge: true });
        console.log(`[ZERO MUTATION] Mapped device contact: ${lid} -> ${phone}`);
      } catch (err) { console.error('Map save error:', err); }
    };

    global._waSock.ev.on('contacts.upsert', (contacts: any) => {
      contacts.forEach((c: any) => {
        if (c.id && c.lid && c.id.includes('@s.whatsapp.net')) {
          const realPhone = c.id.split('@')[0];
          saveLidMap(c.lid, realPhone);
        }
      });
    });

    global._waSock.ev.on('contacts.update', (updates: any) => {
      updates.forEach((u: any) => {
        if (u.id && u.lid && u.id.includes('@s.whatsapp.net')) {
          const realPhone = u.id.split('@')[0];
          saveLidMap(u.lid, realPhone);
        }
      });
    });

    global._waSock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        global._waQrCode = await QRCode.toDataURL(qr);
        global._waStatus = 'waiting';
      }
      if (connection === 'open') {
        global._waStatus = 'connected';
        global._waQrCode = '';
        global._waConnecting = false;
        
        // Sync to globalThis for HMR persistence
        syncToGlobalThis();
        
        // --- 🌐 INITIALIZE BOT 3 TRACKER ---
        setupBot3Tracker();
        
        // --- LOAD EXISTING MAPPINGS: Load LID mappings from Firestore ---
        console.log('[CONTACT SYNC] Connection open - loading existing mappings...');
        try {
          // Load existing mappings from Firestore
          const snap = await db.collection('system_settings').doc('lid_map').get();
          if (snap.exists) {
            const data = snap.data() || {};
            const filteredData = Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== undefined));
            Object.assign(global._jidMap, filteredData);
            console.log(`[CONTACT SYNC] Loaded ${Object.keys(filteredData).length} total mappings from Firestore.`);
          }
          
          // Contacts will be mapped as they come in through events.upsert
          console.log('[CONTACT SYNC] Ready to map new contacts as they arrive');
        } catch (err) { 
          console.error('[CONTACT SYNC] Error loading mappings:', err); 
        }
      }
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        global._waConnecting = false;
        console.log(`[CONNECTION] Closed with status: ${statusCode}`);
        
        // Sync to globalThis
        syncToGlobalThis();
        
        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          global._waSock = null;
          globalThis._waSock = null;
          global._waStatus = 'error';
          globalThis._waStatus = 'error';
          console.log('[CONNECTION] Logged out - requires re-authentication');
          return;
        }
        
        // For other connection issues, attempt reconnection
        global._waSock = null;
        globalThis._waSock = null;
        global._waStatus = 'idle';
        globalThis._waStatus = 'idle';
        console.log('[CONNECTION] Attempting reconnection in 3 seconds...');
        setTimeout(connectToWhatsApp, 3000);
      }
    });

    global._waSock.ev.on('messages.upsert', async (m: any) => {
      if (m.type !== 'notify') return;
      for (const msg of m.messages) {
        // STEP 1: Log the Raw Payload
        console.log('--- RAW WHATSAPP MESSAGE START ---');
        console.log(JSON.stringify(msg, null, 2));
        console.log('--- RAW WHATSAPP MESSAGE END ---');

        try {
          const rawJid = msg.key.remoteJid;
          if (!rawJid || rawJid === 'status@broadcast') continue;

          // --- ZERO MUTATION POLICY: RESOLVE LIDs USING BAILEYS STORE ---
          let jid = rawJid;
          const fromMe = msg.key.fromMe ?? false;

          // STEP 2 & 3: Resolve LIDs using Baileys in-memory store
          if (isLid(rawJid)) {
            // First try payload search (Step 2) - sometimes still works
            const payloadJid = findRealJid(msg);
            if (payloadJid) {
              jid = payloadJid;
              console.log(`[RESOLVE] Found real JID in payload: ${rawJid} -> ${jid}`);
            } else {
              // PRIMARY METHOD: Use Baileys in-memory store (Step 3)
              const resolvedJid = resolveLidToRealNumber(rawJid);
              if (resolvedJid) {
                jid = resolvedJid;
                console.log(`[RESOLVE] Found real JID via store: ${rawJid} -> ${jid}`);
              } else {
                // CRITICAL FIX: Don't block LID messages! Use fallback to ensure they appear in UI
                console.log(`[RESOLVE] No mapping for LID: ${rawJid} - USING FALLBACK FOR UI SYNC`);
                jid = rawJid; // Keep original LID for now, will be handled in fallback logic
              }
            }
          }

          // 🤖 3-BOT ARCHITECTURE: Admin Number Check
          const ADMIN_JID = '212688771251@s.whatsapp.net';
          const isAdmin = jid === ADMIN_JID;

          const mContent = msg.message;
          const text = mContent?.conversation || 
                      mContent?.extendedTextMessage?.text || 
                      mContent?.imageMessage?.caption ||
                      mContent?.ephemeralMessage?.message?.extendedTextMessage?.text ||
                      mContent?.ephemeralMessage?.message?.conversation ||
                      mContent?.ephemeralMessage?.message?.imageMessage?.caption ||
                      mContent?.viewOnceMessage?.message?.conversation ||
                      mContent?.viewOnceMessage?.message?.extendedTextMessage?.text || 
                      mContent?.viewOnceMessage?.message?.imageMessage?.caption || '';

          const isImage = !!mContent?.imageMessage || 
                          !!mContent?.ephemeralMessage?.message?.imageMessage || 
                          !!mContent?.viewOnceMessage?.message?.imageMessage ||
                          !!mContent?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

          const contextInfo = mContent?.extendedTextMessage?.contextInfo ||
                            mContent?.imageMessage?.contextInfo ||
                            mContent?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
                            mContent?.ephemeralMessage?.message?.imageMessage?.contextInfo ||
                            mContent?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo ||
                            mContent?.viewOnceMessage?.message?.imageMessage?.contextInfo;

          const quotedMessage = contextInfo?.quotedMessage;
          if (!text && !isImage) continue;

          // 🤖 BOT ROUTING LOGIC
          if (isAdmin) {
            // 👑 BOT 2: The Manager - Admin Facing
            await handleBot2Manager(text, contextInfo, jid);
            continue;
          }

          if (!fromMe) {
            // 🤖 BOT 1: The Receptionist - Customer Facing
            await handleBot1Receptionist(text, jid, msg);
            continue;
          }

          const timestamp = new Date().toISOString();
          
          // --- PERFECT MIRROR: Exact device phone extraction ---
          // Extract phone exactly as stored in device contacts
          let realId = jid.split('@')[0];
          
          // Special Case: fromMe messages (outgoing)
          // If I send a message, the 'remoteJid' is the customer.
          // We must ensure 'realId' is the customer's phone number, not mine.
          // CRITICAL: Outgoing messages can also have @lid, so we need to resolve them too!
          if (fromMe) {
            if (isLid(jid)) {
              // This is an outgoing message to an @lid - resolve it!
              const resolvedJid = resolveLidToRealNumber(jid);
              if (resolvedJid) {
                console.log(`[OUTGOING] Resolved LID: ${jid} -> ${resolvedJid}`);
                realId = resolvedJid.split('@')[0];
              } else {
                console.log(`[OUTGOING] Could not resolve LID: ${jid} - using raw ID`);
                realId = jid.split('@')[0]; // Fallback
              }
            } else if (jid.includes('@s.whatsapp.net')) {
              realId = jid.split('@')[0];
            }
          }
          
          // CRITICAL FIX: Handle unresolved LIDs with fallback for UI sync
          if (isLid(jid) && realId.startsWith(jid.split('@')[0])) {
            // This is still an unresolved LID, try to extract phone from message or use fallback
            const extractedPhone = extractPhoneNumber(text || '', realId);
            if (extractedPhone && extractedPhone !== realId) {
              console.log(`[FALLBACK] Extracted phone from message: ${realId} -> ${extractedPhone}`);
              realId = extractedPhone;
            } else {
              // Final fallback: Clean the LID for display (remove @lid if present)
              realId = realId.includes('@lid') ? realId.split('@')[0] : realId;
              console.log(`[FALLBACK] Using cleaned LID for display: ${realId}`);
            }
          }
          
          // Only use formatting for the Customer Order Bot (Bot 1)
          const cleanSenderPhone = forceMoroccanFormat(realId);

          // --- MEDIA HANDLING ---
          let mediaUrl = '';
          if (isImage) {
            try {
              const buffer = await downloadMediaMessage(msg, 'buffer', {});
              if (buffer) {
                const url = await uploadToImgBB(buffer as Buffer);
                if (url) mediaUrl = url;
              }
            } catch (err) { console.error('Media download error:', err); }
          }

          // --- UNIFIED INBOX SYNC (Always runs for Admin, fromMe, and Customer) ---
          try {
            const batch = db.batch();
            const inboxRef = db.collection('whatsapp_inbox').doc();
            
            const inboxPayload = sanitizeFirestoreData({
              senderNumber: realId,
              realCustomerNumber: cleanSenderPhone,
              messageBody: text,
              messageType: isImage ? 'image' : 'text',
              mediaUrl: mediaUrl || null,
              timestamp, fromMe, jid,
              extractedData: null, // Extracted data is now handled by Bot 1
              rawMessage: msg,
              quotedMsg: quotedMessage ? {
                key: { remoteJid: jid, fromMe: false, id: contextInfo.stanzaId, participant: contextInfo.participant },
                message: quotedMessage
              } : null,
              isArchived: false
            });

            batch.set(inboxRef, inboxPayload);

            const contactPayload = sanitizeFirestoreData({
              phone: realId, 
              realCustomerNumber: cleanSenderPhone, 
              jid,
              lastMessage: text || (isImage ? '📷 Photo' : ''),
              timestamp, 
              isArchived: false
            });

            batch.set(db.collection('whatsapp_contacts').doc(realId), contactPayload, { merge: true });
            
            await batch.commit();
            console.log('✅ [AI SYNC] Successfully saved to Firestore inbox.');
          } catch (err: any) {
            console.error('Inbox sync error:', err);
          }

        } catch (err: any) { 
          console.error('Critical Msg Error:', err); 
        }
      }
    });

  } catch (err: any) {
    console.error('Socket error:', err);
    global._waConnecting = false;
    globalThis._waConnecting = false;
    syncToGlobalThis();
    
    // Log detailed error information
    console.error('[CONNECTION] Detailed error info:');
    logConnectionDetails();
  }
}

/**
 * 🤖 BOT 2: The Admin Manager (Admin Facing)
 * - Only responds to authorized admin number: 212688771251@s.whatsapp.net
 * - Handles admin commands for order updates via reply
 * - Updates Firestore documents linked to conversations
 */
async function handleBot2Manager(text: string, contextInfo: any, adminJid: string) {
  console.log(`👑 [BOT 2 - ADMIN MANAGER] Processing admin command from ${adminJid}`);
  
  try {
    const ADMIN_JID = '212688771251@s.whatsapp.net';
    
    // Double-check authorization
    if (adminJid !== ADMIN_JID) {
      console.log(`🚫 [BOT 2] Unauthorized access attempt from ${adminJid}`);
      return;
    }
    
    // Check if this is a reply to a message (has context)
    if (!contextInfo || !contextInfo.stanzaId) {
      console.log(`📝 [BOT 2] Not a reply message, treating as general command`);
      
      // Handle general admin commands
      const lowerText = text.toLowerCase();
      
      // Settings command
      if (lowerText === '/settings') {
        const s = (await db.collection('system_settings').doc('admin_0688771251').get()).data() || global._waSettings;
        const response = `📋 [SETTINGS]\nPrice: ${s.sellingPrice} DH\nCost: ${s.productCost} DH\nShip: ${s.shippingFee} DH\nPackaging: ${s.packagingCost} DH`;
        await global._waSock.sendMessage(adminJid, { text: response });
        return;
      }
      
      // Set command
      if (lowerText.startsWith('/set ') && text.split(' ').length === 4) {
        const parts = text.split(' ');
        const update = {
          shippingFee: parseFloat(parts[1]),
          productCost: parseFloat(parts[2]),
          sellingPrice: parseFloat(parts[3])
        };
        await db.collection('system_settings').doc('admin_0688771251').set(update, { merge: true });
        global._waSettings = { ...global._waSettings, ...update };
        await global._waSock.sendMessage(adminJid, { text: `✅ Settings updated: Ship=${update.shippingFee}, Cost=${update.productCost}, Price=${update.sellingPrice}` });
        return;
      }
      
      // Pricing commands
      const sellMatch = text.match(/(?:ثمن البيع(?: هو)?|البيع)\s*(\d+)/i);
      const costMatch = text.match(/(?:ثمن الجملة(?: هو)?|الجملة)\s*(\d+)/i);
      
      if (sellMatch || costMatch) {
        const update: any = {};
        if (sellMatch) update.sellingPrice = parseFloat(sellMatch[1]);
        if (costMatch) update.productCost = parseFloat(costMatch[1]);
        
        await db.collection('system_settings').doc('admin_0688771251').set(update, { merge: true });
        global._waSettings = { ...global._waSettings, ...update };
        
        let response = '✅ Pricing updated:\n';
        if (sellMatch) response += `Selling Price: ${update.sellingPrice} DH\n`;
        if (costMatch) response += `Product Cost: ${update.productCost} DH`;
        
        await global._waSock.sendMessage(adminJid, { text: response });
        return;
      }
      
      console.log(`📝 [BOT 2] No recognized command in: ${text}`);
      return;
    }
    
    // This is a reply to a message - try to update the linked order
    const quotedMessageId = contextInfo.stanzaId;
    console.log(`🔗 [BOT 2] Reply to message: ${quotedMessageId}`);
    
    // Find the original message in inbox to get the customer info
    const inboxSnapshot = await db.collection('whatsapp_inbox')
      .where('rawMessage.key.id', '==', quotedMessageId)
      .limit(1)
      .get();
    
    if (inboxSnapshot.empty) {
      await global._waSock.sendMessage(adminJid, { text: `❌ Could not find original message to update` });
      return;
    }
    
    const inboxDoc = inboxSnapshot.docs[0];
    const inboxData = inboxDoc.data();
    const customerJid = inboxData.jid;
    const customerPhone = inboxData.realCustomerNumber || customerJid.split('@')[0];
    
    console.log(`👤 [BOT 2] Found customer: ${customerPhone}`);
    
    // Look for recent orders from this customer
    const ordersSnapshot = await db.collection('orders')
      .where('phone', '==', customerPhone)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();
    
    if (ordersSnapshot.empty) {
      await global._waSock.sendMessage(adminJid, { text: `❌ No recent order found for customer ${customerPhone}` });
      return;
    }
    
    const orderDoc = ordersSnapshot.docs[0];
    const orderId = orderDoc.id;
    const orderData = orderDoc.data();
    
    console.log(`📦 [BOT 2] Found order: ${orderId}`);
    
    // Parse admin update commands
    const update: any = {};
    const lowerText = text.toLowerCase();
    
    // Product update
    const productMatch = text.match(/(?:product|produit|منتج)\s*[:=]?\s*(.+)/i);
    if (productMatch) {
      update.product = productMatch[1].trim();
    }
    
    // Price updates
    const sellMatch = text.match(/(?:price|prix|ثمن|selling)\s*[:=]?\s*(\d+)/i);
    if (sellMatch) {
      update.sellingPrice = parseFloat(sellMatch[1]);
    }
    
    const costMatch = text.match(/(?:cost|coût|تكلفة|جملة)\s*[:=]?\s*(\d+)/i);
    if (costMatch) {
      update.productCost = parseFloat(costMatch[1]);
    }
    
    // Ad ID update
    const adMatch = text.match(/(?:ad\s*id|adid|annonce|إعلان)\s*[:=]?\s*(.+)/i);
    if (adMatch) {
      update.adId = adMatch[1].trim();
    }
    
    // Status update
    const statusMatch = text.match(/(?:status|état|حالة)\s*[:=]?\s*(pending|shipped|delivered|returned)/i);
    if (statusMatch) {
      update.status = statusMatch[1].toLowerCase();
    }
    
    if (Object.keys(update).length === 0) {
      await global._waSock.sendMessage(adminJid, { 
        text: `❓ No valid update format found. Use:\n• Product: [name]\n• Price: [amount]\n• Cost: [amount]\n• Ad ID: [id]\n• Status: [pending|shipped|delivered|returned]` 
      });
      return;
    }
    
    // Apply the update
    await db.collection('orders').doc(orderId).set(update, { merge: true });
    
    // Confirm update to admin
    let confirmation = `✅ Order ${orderId} updated:\n`;
    Object.entries(update).forEach(([key, value]) => {
      confirmation += `• ${key}: ${value}\n`;
    });
    confirmation += `Customer: ${orderData.customerName} (${customerPhone})`;
    
    await global._waSock.sendMessage(adminJid, { text: confirmation });
    console.log(`✅ [BOT 2] Order ${orderId} updated successfully`);
    
  } catch (err: any) {
    console.error(`❌ [BOT 2] Error:`, err);
    await global._waSock.sendMessage(adminJid, { text: `❌ Error processing command: ${err?.message || 'Unknown error'}` });
  }
}

// ─── API HANDLERS ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Initialize connection if needed
    if (!global._waSock && !global._waConnecting) {
      global._waStatus = 'connecting';
      connectToWhatsApp();
      await new Promise(r => setTimeout(r, 1000));
    }
    
    const body = await request.json().catch(() => ({}));
    const cleanNumber = body.phoneNumber?.trim().replace(/\D/g, '').replace(/^00/, '');
    let pairingCode = '';
    
    // Only request pairing code if socket exists but not connected
    if (cleanNumber && global._waSock && global._waStatus === 'connecting') {
      try { 
        pairingCode = await global._waSock.requestPairingCode(cleanNumber); 
      } catch (err) { 
        console.log('[PAIRING] Error requesting pairing code:', err); 
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      status: global._waStatus, 
      qrCode: global._waQrCode, 
      pairingCode,
      user: global._waSock?.user || null
    });
  } catch (err: any) { 
    console.error('[ROUTE] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 }); 
  }
}

export async function GET() {
  try {
    const hasCreds = fs.existsSync(AUTH_FOLDER) && fs.existsSync(`${AUTH_FOLDER}/creds.json`);
    
    // Auto-connect if we have credentials but no socket
    if (!global._waSock && hasCreds && !global._waConnecting) {
      console.log('[GET] Auto-connecting WhatsApp with existing credentials...');
      global._waStatus = 'connecting';
      connectToWhatsApp();
      // Wait longer for connection to establish
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // If socket exists but not connected, try to reconnect
    if (global._waSock && global._waStatus !== 'connected' && !global._waConnecting) {
      console.log('[GET] Socket exists but not connected, attempting reconnection...');
      global._waStatus = 'connecting';
      global._waConnecting = true;
      // Force reconnection by recreating socket
      global._waSock = null;
      connectToWhatsApp();
      await new Promise(r => setTimeout(r, 3000));
    }
    
    return NextResponse.json({ 
      success: true, 
      status: global._waStatus, 
      qrCode: global._waQrCode,
      user: global._waSock?.user || null,
      connecting: global._waConnecting
    });
  } catch (err: any) { 
    console.error('[GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 }); 
  }
}

export async function DELETE() {
  try {
    if (global._waSock) { await global._waSock.logout(); global._waSock = null; }
    if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    global._waQrCode = ''; global._waStatus = 'idle';
    return NextResponse.json({ success: true });
  } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }); }
}

// Export functions for other routes
export { connectToWhatsApp, isConnectionReady, waitForConnection, ensureConnection, checkSessionHealth, logConnectionDetails };
