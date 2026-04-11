import { NextRequest, NextResponse } from 'next/server';

// This endpoint would be called by a cron job every 15-30 minutes
// to automatically sync insights for all active campaigns

export async function POST(request: NextRequest) {
  try {
    // Verify this is a cron job request (you might want to add authentication)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all campaigns from your database
    // This is a placeholder - you'd fetch from your actual database
    const campaignsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/campaigns`);
    if (!campaignsResponse.ok) {
      throw new Error('Failed to fetch campaigns');
    }
    
    const campaigns = await campaignsResponse.json();
    const activeCampaigns = campaigns.filter((c: any) => c.isActive && c.metaCampaignId);

    if (activeCampaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active campaigns with Meta Campaign ID found',
        synced: 0
      });
    }

    // Get global settings for access token
    const settingsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings/meta`);
    if (!settingsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Meta settings' },
        { status: 500 }
      );
    }

    const settings = await settingsResponse.json();
    if (!settings.capiAccessToken) {
      return NextResponse.json(
        { error: 'CAPI Access Token not configured' },
        { status: 400 }
      );
    }

    let syncedCount = 0;
    const errors = [];

    // Sync each campaign
    for (const campaign of activeCampaigns) {
      try {
        const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.metaCampaignId}/insights`;
        const params = new URLSearchParams({
          access_token: settings.capiAccessToken,
          fields: 'impressions,clicks,cost_per_result,spend,conversations_started',
          date_preset: 'last_30d',
          level: 'campaign'
        });

        const response = await fetch(`${insightsUrl}?${params}`);
        
        if (!response.ok) {
          errors.push(`Campaign ${campaign.id}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.error) {
          errors.push(`Campaign ${campaign.id}: ${data.error.message}`);
          continue;
        }

        const insights = data.data?.[0];
        if (insights) {
          // Update campaign with new metrics
          await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/campaigns/${campaign.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actualSpent: insights.spend || 0,
              conversationsStarted: insights.conversations_started || 0,
              impressions: insights.impressions || 0,
              linkClicks: insights.clicks || 0,
              costPerMessage: insights.cost_per_result || 0,
              lastSync: new Date().toISOString()
            })
          });
          
          syncedCount++;
        }
      } catch (error) {
        errors.push(`Campaign ${campaign.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} out of ${activeCampaigns.length} campaigns`,
      synced: syncedCount,
      total: activeCampaigns.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in cron sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
