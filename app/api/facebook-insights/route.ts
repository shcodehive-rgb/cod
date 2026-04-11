import { NextRequest, NextResponse } from 'next/server';

interface FacebookInsightMetrics {
  impressions: number;
  linkClicks: number;
  costPerMessage: number;
  spend: number;
  conversationsStarted: number;
}

// Fetch Facebook Insights API data
const fetchFacebookInsights = async (campaignId: string, accessToken: string): Promise<FacebookInsightMetrics | null> => {
  try {
    const insightsUrl = `https://graph.facebook.com/v18.0/${campaignId}/insights`;
    
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'impressions,clicks,cost_per_result,spend',
      date_preset: 'last_30d',
      level: 'campaign'
    });

    const response = await fetch(`${insightsUrl}?${params}`);
    
    if (!response.ok) {
      console.error('Facebook API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('Facebook API error:', data.error);
      return null;
    }

    const insights = data.data?.[0];
    if (!insights) {
      return null;
    }

    return {
      impressions: insights.impressions || 0,
      linkClicks: insights.clicks || 0,
      costPerMessage: insights.cost_per_result || 0,
      spend: insights.spend || 0,
      conversationsStarted: insights.conversations_started || 0
    };
  } catch (error) {
    console.error('Error fetching Facebook insights:', error);
    return null;
  }
};

// GET - Fetch insights for a specific campaign
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
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
        { error: 'CAPI Access Token not configured' },
        { status: 400 }
      );
    }

    const insights = await fetchFacebookInsights(campaignId, settings.capiAccessToken);
    
    if (!insights) {
      return NextResponse.json(
        { error: 'Failed to fetch insights from Facebook API' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error in GET /api/facebook-insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Trigger sync for all campaigns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignIds } = body;

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

    const results = [];
    
    // If specific campaign IDs provided, sync only those
    // Otherwise, you might want to fetch all campaigns from your database
    const targetCampaignIds = campaignIds || [];
    
    for (const campaignId of targetCampaignIds) {
      const insights = await fetchFacebookInsights(campaignId, settings.capiAccessToken);
      
      results.push({
        campaignId,
        success: !!insights,
        data: insights
      });
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.length} campaigns`,
      results
    });
  } catch (error) {
    console.error('Error in POST /api/facebook-insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
