import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Import the health check functions from main route
    const { checkSessionHealth, logConnectionDetails } = await import('../route');
    
    // Perform health check
    const health = checkSessionHealth();
    
    // Get additional status info
    const sock = global._waSock || globalThis._waSock;
    const status = global._waStatus || globalThis._waStatus;
    const connecting = global._waConnecting || globalThis._waConnecting;
    
    const response = {
      healthy: health.healthy,
      status: status,
      connecting: connecting,
      socketExists: !!sock,
      userAuthenticated: !!sock?.user,
      websocketReady: sock?.ws?.readyState === 1,
      issues: health.issues,
      timestamp: new Date().toISOString(),
      debug: {
        socketType: typeof sock,
        websocketState: sock?.ws?.readyState,
        userId: sock?.user?.id,
        socketId: sock?.id
      }
    };
    
    // Log detailed info if requested
    const url = new URL(req.url);
    if (url.searchParams.get('verbose') === 'true') {
      logConnectionDetails();
    }
    
    return NextResponse.json(response, { 
      status: health.healthy ? 200 : 503 
    });
    
  } catch (error: any) {
    console.error('[HEALTH CHECK] Error:', error);
    return NextResponse.json({ 
      healthy: false, 
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
