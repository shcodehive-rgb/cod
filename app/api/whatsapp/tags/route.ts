import { NextRequest, NextResponse } from 'next/server';

/**
 * Tag Management API
 * ─────────────────────────────────────────────────────────────────────────────
 * Adds or removes tags from a contact in the whatsapp_contacts collection.
 */
export async function POST(req: NextRequest) {
  try {
    const { contactId, tag, action } = await req.json();

    if (!contactId || !tag || !action) {
      return NextResponse.json({ error: 'Missing contactId, tag, or action' }, { status: 400 });
    }

    const { db, FieldValue } = await import('@/lib/firebase');
    const contactRef = db.collection('whatsapp_contacts').doc(contactId);

    const updateData: any = {};
    
    if (action === 'add') {
      updateData.tags = FieldValue.arrayUnion(tag);
    } else if (action === 'remove') {
      updateData.tags = FieldValue.arrayRemove(tag);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Always ensure contact is marked as active when manually tagged
    updateData.timestamp = new Date().toISOString();

    await contactRef.set(updateData, { merge: true });

    console.log(`🏷️ [TAGS] ${action === 'add' ? 'Added' : 'Removed'} tag "${tag}" for ${contactId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [TAGS ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
