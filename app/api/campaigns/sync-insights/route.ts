import { NextRequest, NextResponse } from 'next/server';

// POST - Sync insights for a specific campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, metaCampaignId } = body;

    if (!campaignId || !metaCampaignId) {
      return NextResponse.json(
        { error: 'Campaign ID and Meta Campaign ID are required' },
        { status: 400 }
      );
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
        { error: 'CAPI Access Token not configured. Please configure it in Settings.' },
        { status: 400 }
      );
    }

    // Fetch Facebook Insights
    const insightsUrl = `https://graph.facebook.com/v18.0/${metaCampaignId}/insights`;
    const params = new URLSearchParams({
      access_token: settings.capiAccessToken,
      fields: 'impressions,clicks,cost_per_result,spend,conversations_started',
      date_preset: 'last_30d',
      level: 'campaign'
    });

    const response = await fetch(`${insightsUrl}?${params}`);
    
    if (!response.ok) {
      console.error('Facebook API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch data from Facebook API' },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('Facebook API error:', data.error);
      return NextResponse.json(
        { error: `Facebook API error: ${data.error.message}` },
        { status: 500 }
      );
    }

    const insights = data.data?.[0];
    if (!insights) {
      return NextResponse.json(
        { error: 'No insights data available for this campaign' },
        { status: 404 }
      );
    }

    const metrics = {
      actualSpent: insights.spend || 0,
      conversationsStarted: insights.conversations_started || 0,
      impressions: insights.impressions || 0,
      linkClicks: insights.clicks || 0,
      costPerMessage: insights.cost_per_result || 0,
      lastSync: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Campaign insights synced successfully',
      ...metrics
    });
  } catch (error) {
    console.error('Error in POST /api/campaigns/sync-insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
