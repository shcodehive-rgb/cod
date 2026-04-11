import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST() {
  try {
    console.log('Starting reset of test data...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Define test data cutoff - anything before today is considered test data
    const testCutoffDate = today;
    
    let deletedOrders = 0;
    let deletedCampaigns = 0;
    let resetCampaignSpend = 0;
    
    // 1. Delete test orders (orders before today)
    console.log('Deleting test orders...');
    const ordersSnapshot = await db.collection('orders').get();
    
    for (const doc of ordersSnapshot.docs) {
      const orderData = doc.data();
      const createdAt = orderData.created_at?.toDate ? orderData.created_at.toDate() : new Date(orderData.created_at);
      
      if (createdAt < testCutoffDate) {
        await db.collection('orders').doc(doc.id).delete();
        deletedOrders++;
        console.log(`Deleted test order: ${doc.id} (${orderData.customerName})`);
      }
    }
    
    // 2. Delete test campaigns (campaigns before today)
    console.log('Deleting test campaigns...');
    const campaignsSnapshot = await db.collection('campaigns').get();
    
    for (const doc of campaignsSnapshot.docs) {
      const campaignData = doc.data();
      const createdAt = campaignData.created_at?.toDate ? campaignData.created_at.toDate() : new Date(campaignData.created_at);
      
      if (createdAt < testCutoffDate) {
        await db.collection('campaigns').doc(doc.id).delete();
        deletedCampaigns++;
        console.log(`Deleted test campaign: ${doc.id} (${campaignData.name})`);
      } else {
        // For remaining campaigns, reset financial data to force API sync
        await db.collection('campaigns').doc(doc.id).update({
          actualSpent: 0,
          impressions: 0,
          linkClicks: 0,
          conversationsStarted: 0,
          costPerMessage: 0,
          lastSync: null
        });
        resetCampaignSpend++;
        console.log(`Reset financial data for campaign: ${doc.id} (${campaignData.name})`);
      }
    }
    
    console.log(`Reset complete! Deleted ${deletedOrders} test orders and ${deletedCampaigns} test campaigns. Reset financial data for ${resetCampaignSpend} campaigns.`);
    
    return NextResponse.json({
      success: true,
      message: 'Test data reset completed successfully',
      deletedRecords: {
        orders: deletedOrders,
        campaigns: deletedCampaigns,
        total: deletedOrders + deletedCampaigns
      },
      resetCampaigns: resetCampaignSpend,
      realDataPreserved: {
        ordersFromToday: ordersSnapshot.size - deletedOrders,
        campaignsFromToday: campaignsSnapshot.size - deletedCampaigns
      },
      nextSteps: [
        'All test data has been removed',
        'Campaign financial data reset to force API sync',
        'Actual Spent will now be populated only from Facebook Insights',
        'CPA calculations will use real confirmed orders only'
      ]
    });
    
  } catch (error) {
    console.error('Reset failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset test data',
      details: String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed',
    message: 'Use POST to reset test data'
  }, { status: 405 });
}
