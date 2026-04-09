import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { contactId, isArchived } = await req.json();

    if (!contactId) {
      return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });
    }

    const db = (await import('@/lib/firebase')).db;

    // Find all messages for this contact and update isArchived
    const snapshot = await db.collection('whatsapp_inbox')
      .where('senderNumber', '==', contactId)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isArchived: !!isArchived });
    });
    await batch.commit();

    console.log(`✅ [ARCHIVE] ${isArchived ? 'Archived' : 'Unarchived'} contact: ${contactId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [ARCHIVE ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
