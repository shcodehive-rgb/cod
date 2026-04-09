import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { campaignId, isActive, metaCampaignId } = await req.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
    }

    // 1. If linked to Meta, perform the Outbound API Call
    if (metaCampaignId) {
      const META_TOKEN = process.env.META_SYSTEM_USER_TOKEN;
      if (!META_TOKEN) {
        return NextResponse.json({ error: 'META_SYSTEM_USER_TOKEN is missing in environment.' }, { status: 500 });
      }

      // Meta uses 'ACTIVE' or 'PAUSED'
      const newStatus = isActive ? 'ACTIVE' : 'PAUSED';
      
      console.log(`🚀 [META API] Toggling Campaign ${metaCampaignId} to ${newStatus}...`);
      const response = await fetch(`https://graph.facebook.com/v19.0/${metaCampaignId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${META_TOKEN}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [META API ERROR]:', data);
        return NextResponse.json({ error: 'Failed to update Meta Campaign', details: data }, { status: 502 });
      }

      console.log(`✅ [META API] Successfully updated ${metaCampaignId} to ${newStatus}`);
    }

    // 2. Safely Update Firestore
    await db.collection('campaigns').doc(campaignId).update({
      isActive,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [CAMPAIGN TOGGLE ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
