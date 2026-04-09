import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { jid, imageBase64, mimeType, caption, fileName, quotedMsg } = await req.json();

    if (!jid || !imageBase64) {
      return NextResponse.json({ error: 'Missing jid or imageBase64' }, { status: 400 });
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

    // ── 3. SOCKET READINESS CHECK ──
    if (!global._waSock) {
      return NextResponse.json({ error: 'WhatsApp is NOT connected. Please check dashboard.' }, { status: 503 });
    }

    // Check if socket is actually ready and connected
    if (global._waSock.ws?.readyState !== 1) {
      return NextResponse.json({ error: 'WhatsApp connection is not ready. Please wait or reconnect.' }, { status: 503 });
    }

    // Check if connection is ready
    if (global._waStatus !== 'connected' || !global._waSock.user) {
      return NextResponse.json({ 
        error: 'WhatsApp connection is not ready. Please wait for connection to stabilize.', 
        status: global._waStatus 
      }, { status: 503 });
    }

    console.log(`\n📸 [API] Sending image to ${cleanJid}${quotedMsg ? ' (REPLY)' : ''}...`);

    // Convert base64 to Buffer for Baileys
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // ── 4. EXECUTE SEND WITH TIMEOUT ──
    const sendPromise = global._waSock.sendMessage(
      cleanJid, 
      {
        image: imageBuffer,
        mimetype: mimeType || 'image/jpeg',
        caption: caption || '',
        fileName: fileName || 'photo.jpg',
      },
      { quoted: quotedMsg }
    );
    
    // Add 30 second timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Message send timeout - please try again')), 30000);
    });
    
    const result = await Promise.race([sendPromise, timeoutPromise]) as any;

    // ── Upload image to ImgBB for persistent URL ───────────────────────────
    let mediaUrl: string | null = null;
    try {
      const formData = new FormData();
      formData.append('image', imageBase64);
      const imgbbRes = await fetch(
        `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
        { method: 'POST', body: formData }
      );
      const imgbbData = await imgbbRes.json();
      if (imgbbData.success) mediaUrl = imgbbData.data.url;
    } catch (uploadErr) {
      console.warn('⚠️ [API] ImgBB upload failed, using base64 fallback');
      mediaUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64.substring(0, 100)}...`;
    }

    // ── Sync to Firestore & Unarchive ──────────────────────────────────────
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
        realCustomerNumber: cleanRealNum,
        messageBody: caption || '',
        messageType: 'image',
        mediaUrl,
        timestamp: new Date().toISOString(),
        fromMe: true,
        isProcessed: true,
        hasPotentialOrder: false,
        jid: cleanJid,
        isArchived: false,
        quotedMsg: quotedMsg || null
      });

      await batch.commit();
      console.log('✅ [API] Manually synced sent image & unarchived contact');
    } catch (dbErr) {
      console.error('⚠️ [API] Firestore sync failed:', dbErr);
    }

    console.log('✅ [API] Image sent successfully!');
    return NextResponse.json({ success: true, result, mediaUrl });

  } catch (error: any) {
    console.error('❌ [API IMAGE SEND ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
