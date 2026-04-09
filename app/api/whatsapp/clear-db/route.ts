import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

/**
 * UTILITY ROUTE: Clears the whatsapp_inbox and whatsapp_contacts collections.
 * Use this to wipe corrupted legacy data and start a fresh test.
 */
export async function GET() {
  try {
    console.log('🗑️  [CLEANUP] Starting database wipe...');
    
    // 1. Clear whatsapp_inbox
    const inboxSnap = await db.collection('whatsapp_inbox').get();
    const inboxCount = inboxSnap.size;
    const inboxBatch = db.batch();
    inboxSnap.docs.forEach(doc => inboxBatch.delete(doc.ref));
    if (inboxCount > 0) await inboxBatch.commit();
    
    // 2. Clear whatsapp_contacts
    const contactSnap = await db.collection('whatsapp_contacts').get();
    const contactCount = contactSnap.size;
    const contactBatch = db.batch();
    contactSnap.docs.forEach(doc => contactBatch.delete(doc.ref));
    if (contactCount > 0) await contactBatch.commit();
    
    console.log(`✅ [CLEANUP] Wiped ${inboxCount} messages and ${contactCount} contacts.`);
    
    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully.',
      clearedInbox: inboxCount,
      clearedContacts: contactCount
    });
  } catch (error: any) {
    console.error('❌ [CLEANUP ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
