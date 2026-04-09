import { NextRequest, NextResponse } from 'next/server';

declare global {
  var _waSock: any;
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();
    
    if (!phoneNumber || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number and message are required' 
      }, { status: 400 });
    }

    if (!global._waSock) {
      return NextResponse.json({ 
        success: false, 
        error: 'WhatsApp not connected' 
      }, { status: 400 });
    }

    // Clean and format phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '').replace(/^00/, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
      // Send message
      await global._waSock.sendMessage(jid, { text: message });
      
      console.log(`📤 [DIAL] Sent message to ${cleanPhone}: ${message}`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Message sent successfully',
        to: cleanPhone,
        messageBody: message
      });
    } catch (error: any) {
      console.error('❌ [DIAL] Send message error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to send message' 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ [DIAL] API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
