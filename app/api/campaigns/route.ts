import { NextRequest, NextResponse } from 'next/server';
import { createCampaign } from '@/app/actions';

export async function POST(request: NextRequest) {
  try {
    const campaignData = await request.json();
    
    // Add default values - NO CLIENT-SIDE TIMESTAMPS
    // Let the server action handle timestamps with FieldValue.serverTimestamp()
    const processedCampaignData = {
      ...campaignData,
      isActive: campaignData.isActive !== false, // Default to true
      orders_generated: campaignData.orders_generated || 0,
      plannedBudget: campaignData.plannedBudget || 0,
      actualSpent: campaignData.actualSpent || 0,
    };

    const result = await createCampaign(processedCampaignData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        message: 'Campaign created successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { fetchCampaigns } = await import('@/app/actions');
    const campaigns = await fetchCampaigns();
    
    return NextResponse.json({ 
      success: true, 
      data: campaigns 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch campaigns' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...campaignData } = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Campaign ID is required' 
      }, { status: 400 });
    }

    // NO CLIENT-SIDE TIMESTAMPS - Let server action handle updated_at with FieldValue.serverTimestamp()
    const processedCampaignData = {
      ...campaignData,
    };

    const { updateCampaign } = await import('@/app/actions');
    const result = await updateCampaign(id, processedCampaignData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Campaign updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Campaign ID is required' 
      }, { status: 400 });
    }

    const { deleteCampaign } = await import('@/app/actions');
    const result = await deleteCampaign(id);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Campaign deleted successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
