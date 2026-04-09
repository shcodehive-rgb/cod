import { NextRequest, NextResponse } from 'next/server';

/**
 * Forward Message Route
 * ─────────────────────────────────────────────────────────────────────────────
 * Forwards a message (text or media) to a target JID using Baileys.
 * If rawMessage is available, it uses the native copyNForward method.
 * Otherwise, it falls back to sending a fresh message.
 */
export async function POST(req: NextRequest) {
  try {
    const { targetJid, sourceMsg, textFallback, mediaUrlFallback, messageType } = await req.json();

    if (!targetJid) {
      return NextResponse.json({ error: 'Missing targetJid' }, { status: 400 });
    }

    if (!global._waSock) {
      return NextResponse.json({ error: 'WhatsApp is NOT connected.' }, { status: 503 });
    }

    let cleanJid = targetJid.replace(/[+\s]/g, '');
    if (!cleanJid.includes('@')) cleanJid = `${cleanJid}@s.whatsapp.net`;

    console.log(`\n↪️ [API] Forwarding message to ${cleanJid}...`);

    let result;
    
    // 1. Native Forward (if rawMessage is available from Firestore)
    if (sourceMsg && sourceMsg.key) {
      console.log('   Using native copyNForward...');
      // Baileys native forward method
      result = await global._waSock.copyNForward(cleanJid, sourceMsg);
    } 
    // 2. Fallback Send (if it's a text message)
    else if (messageType === 'text' && textFallback) {
      console.log('   Using text fallback send...');
      result = await global._waSock.sendMessage(cleanJid, { text: textFallback });
    }
    // 3. Fallback Send (if it's an image message)
    else if (messageType === 'image' && mediaUrlFallback) {
      console.log('   Using image fallback send...');
      result = await global._waSock.sendMessage(cleanJid, { 
        image: { url: mediaUrlFallback },
        caption: textFallback || ''
      });
    } else {
      return NextResponse.json({ error: 'Cannot forward: Missing source data.' }, { status: 400 });
    }

    // ── Sync to Firestore ─────────────────────────────────────────────────
    try {
      const db = (await import('@/lib/firebase')).db;
      const { forceMoroccanFormat } = await import('@/lib/whatsapp-extractor');
      const phone = cleanJid.split('@')[0];
      const jidMap = global._jidMap || {};
      const realNumRaw = jidMap[cleanJid] || (cleanJid.includes('@lid') ? null : phone);
      const cleanRealNum = realNumRaw ? forceMoroccanFormat(realNumRaw) : null;

      await db.collection('whatsapp_inbox').add({
        senderNumber: phone,
        realCustomerNumber: cleanRealNum,
        messageBody: textFallback || (messageType === 'image' ? 'Sent an image' : ''),
        messageType: messageType || 'text',
        mediaUrl: mediaUrlFallback || null,
        timestamp: new Date().toISOString(),
        fromMe: true,
        isProcessed: true,
        hasPotentialOrder: false,
        jid: cleanJid,
        isArchived: false,
        isForwarded: true
      });
    } catch (dbErr) {
      console.error('⚠️ [API] Firestore sync failed for forward:', dbErr);
    }

    console.log('✅ [API] Message forwarded successfully!');
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error('❌ [API FORWARD ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
