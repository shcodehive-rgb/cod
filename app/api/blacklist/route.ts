import { NextRequest, NextResponse } from 'next/server';
import { addToBlacklist } from '@/app/actions';

export async function POST(request: NextRequest) {
  try {
    const blacklistData = await request.json();
    
    // Validate required fields
    if (!blacklistData.phone || !blacklistData.reason) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number and reason are required' 
      }, { status: 400 });
    }

    const result = await addToBlacklist(blacklistData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        message: 'Customer added to blacklist successfully' 
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
    const { fetchBlacklist } = await import('@/app/actions');
    const blacklist = await fetchBlacklist();
    
    return NextResponse.json({ 
      success: true, 
      data: blacklist 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch blacklist' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    
    if (!phone) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number is required' 
      }, { status: 400 });
    }

    const { removeFromBlacklist } = await import('@/app/actions');
    const result = await removeFromBlacklist(phone);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Customer removed from blacklist successfully' 
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
