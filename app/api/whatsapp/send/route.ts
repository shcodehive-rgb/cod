import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let { jid, text, quotedMsg } = await req.json();

    if (!jid || !text) {
      return NextResponse.json({ error: 'Missing jid or text' }, { status: 400 });
    }

    // ── 1. JID VALIDATION ──
    if (!jid || typeof jid !== 'string') {
      return NextResponse.json({ error: 'Invalid JID format' }, { status: 400 });
    }

    // ── 2. CLEAN JID FORMATTING ──
    const jidPrefix = jid.split('@')[0];
    const cleanJid = jid.includes('@lid') ? jid : `${jidPrefix}@s.whatsapp.net`;
    
    // Validate phone number format
    if (!jidPrefix || jidPrefix.length < 10 || jidPrefix.length > 15) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // ── 3. ENHANCED SOCKET READINESS CHECK WITH AUTO-RECONNECT ──
    
    // Import the ensureConnection function from main route
    const { ensureConnection } = await import('../route');
    
    // Check both global and globalThis for HMR compatibility
    const sock = global._waSock || globalThis._waSock;
    const status = global._waStatus || globalThis._waStatus;
    
    console.log(`[SEND API] Socket check: sock=${!!sock}, status=${status}`);
    
    if (!sock) {
      console.log('[SEND API] No socket found, attempting auto-reconnect...');
      const reconnected = await ensureConnection();
      if (!reconnected) {
        return NextResponse.json({ 
          error: 'WhatsApp connection failed. Please scan QR code first.', 
          status: 'reconnect_failed',
          needsReconnect: true,
          debug: { socket: !!sock, status }
        }, { status: 503 });
      }
    }
    
    // Get fresh socket reference after potential reconnect
    const freshSock = global._waSock || globalThis._waSock;
    const freshStatus = global._waStatus || globalThis._waStatus;
    
    // Check if socket is actually ready and connected
    if (freshSock.ws?.readyState !== 1) {
      console.log('[SEND API] Socket not ready, attempting reconnection...');
      const reconnected = await ensureConnection();
      if (!reconnected) {
        return NextResponse.json({ 
          error: 'WhatsApp connection is not ready. Please wait or reconnect.', 
          status: 'socket_not_ready',
          currentStatus: freshStatus,
          needsReconnect: true,
          debug: { readyState: freshSock?.ws?.readyState, status: freshStatus }
        }, { status: 503 });
      }
    }
    
    // Final connection check
    const finalSock = global._waSock || globalThis._waSock;
    const finalStatus = global._waStatus || globalThis._waStatus;
    
    if (finalStatus !== 'connected' || !finalSock?.user) {
      return NextResponse.json({ 
        error: `WhatsApp connection is not ready. Current status: ${finalStatus}. Please wait for connection to stabilize.`, 
        status: finalStatus,
        needsReconnect: finalStatus !== 'connecting',
        debug: { status: finalStatus, hasUser: !!finalSock?.user }
      }, { status: 503 });
    }
    
    console.log('[SEND API] Connection validated, proceeding with send...');

    console.log(`\n[API] Sending message to ${cleanJid}${quotedMsg ? ' (REPLY)' : ''}...`);
    
    // ── 4. EXECUTE SEND WITH TIMEOUT ──
    const sendPromise = finalSock.sendMessage(
      cleanJid, 
      { text: text }, 
      { quoted: quotedMsg }
    );
    
    // Add 30 second timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Message send timeout - please try again')), 30000);
    });
    
    const result = await Promise.race([sendPromise, timeoutPromise]) as any;

    // ── 5. MANUAL FIRESTORE SYNC & UNARCHIVE (Guaranteed UI Update) ──
    try {
      const db = (await import('@/lib/firebase')).db;
      const { forceMoroccanFormat } = await import('@/lib/whatsapp-extractor');
      
      const phone = cleanJid.split('@')[0];
      const cleanRealNum = phone;
      
      const batch = db.batch();
      
      // Unarchive the contact if they were archived
      const prevArchivedSnap = await db.collection('whatsapp_inbox')
        .where('senderNumber', '==', phone)
        .where('isArchived', '==', true)
        .get();
      
      prevArchivedSnap.docs.forEach(doc => {
        batch.update(doc.ref, { isArchived: false });
      });

      const newMessageRef = db.collection('whatsapp_inbox').doc();
      batch.set(newMessageRef, {
        senderNumber: phone,
        realCustomerNumber: cleanRealNum, // For replies, strictly use the correctly formatted number
        messageBody: text,
        messageType: 'text',
        timestamp: new Date().toISOString(),
        fromMe: true,
        isProcessed: true,
        hasPotentialOrder: false,
        jid: cleanJid,
        isArchived: false,
        quotedMsg: quotedMsg || null // Track reply context
      });

      await batch.commit();
      console.log('✅ [API] Manually synced sent message & unarchived contact');
    } catch (dbErr) {
      console.error('⚠️ [API] Firestore sync failed, but message was sent:', dbErr);
    }

    console.log('✅ [API] Message sent successfully!');
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error('❌ [API SEND ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
