import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { campaignId, metaCampaignId } = await req.json();

    if (!campaignId || !metaCampaignId) {
      return NextResponse.json({ error: 'Missing campaignId or metaCampaignId' }, { status: 400 });
    }

    const META_TOKEN = process.env.META_SYSTEM_USER_TOKEN;
    if (!META_TOKEN) {
      return NextResponse.json({ error: 'META_SYSTEM_USER_TOKEN is missing in environment.' }, { status: 500 });
    }

    console.log(`🔄 [META API] Syncing Insights for Campaign ${metaCampaignId}...`);
    
    // Fetch last 7 days insights. Fields: spend, messaging_conversation_started_7d
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${metaCampaignId}/insights?fields=spend,actions&date_preset=last_7d`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${META_TOKEN}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [META API ERROR]:', data);
      return NextResponse.json({ error: 'Failed to fetch Meta Insights', details: data }, { status: 502 });
    }

    let actualSpent = 0;
    let conversationsStarted = 0;

    if (data.data && data.data.length > 0) {
      const insight = data.data[0];
      actualSpent = parseFloat(insight.spend || '0');
      
      const actions = insight.actions || [];
      const msgAction = actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
      if (msgAction) {
        conversationsStarted = parseInt(msgAction.value || '0', 10);
      }
    }

    console.log(`✅ [META API] Stats for ${metaCampaignId}: Spend=${actualSpent}, Messages=${conversationsStarted}`);

    // Update Firestore with fresh data
    await db.collection('campaigns').doc(campaignId).update({
      actualSpent,
      conversationsStarted,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      actualSpent, 
      conversationsStarted 
    });

  } catch (error: any) {
    console.error('❌ [CAMPAIGN SYNC ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
