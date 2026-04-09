import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('🚫 CLEANUP SCRIPT DISABLED - DATA SAFETY FIRST');
    
    // SCRIPT DISABLED - DO NOT DELETE ANY DATA
    return NextResponse.json({
      success: false,
      error: 'Cleanup script has been disabled for data safety',
      message: 'This script was too aggressive and deleted real orders. Manual intervention required.'
    }, { status: 403 });
    
    /* ORIGINAL DISABLED CODE:
    console.log('🧹 Starting cleanup of mock data...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today (April 9)
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1); // April 8
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2); // April 7
    
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // April 6
    
    let deletedOrders = 0;
    let deletedCampaigns = 0;
    
    // Clean up orders
    console.log('📋 Cleaning up orders...');
    const ordersSnapshot = await db.collection('orders').get();
    
    for (const doc of ordersSnapshot.docs) {
      const orderData = doc.data();
      const createdAt = orderData.created_at?.toDate ? orderData.created_at.toDate() : new Date(orderData.created_at);
      
      // Check if order is from April 6, 7, or 8 (mock data dates)
      const isMockDate = (
        (createdAt >= threeDaysAgo && createdAt < twoDaysAgo) || // April 6
        (createdAt >= twoDaysAgo && createdAt < yesterday) ||     // April 7
        (createdAt >= yesterday && createdAt < today)            // April 8
      );
      
      // Also check for mock data patterns (randomized names, etc.)
      const hasMockPatterns = (
        orderData.customerName?.includes('Customer') ||
        orderData.customerName?.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/) && !orderData.customerName?.includes(' ') ||
        orderData.productName?.includes('Product') ||
        orderData.fbclid?.includes('mock_') ||
        orderData.eventId?.includes('mock_')
      );
      
      if (isMockDate || hasMockPatterns) {
        await db.collection('orders').doc(doc.id).delete();
        deletedOrders++;
        console.log(`🗑️ Deleted mock order: ${doc.id} (${orderData.customerName})`);
      }
    }
    
    // Clean up campaigns
    console.log('📊 Cleaning up campaigns...');
    const campaignsSnapshot = await db.collection('campaigns').get();
    
    for (const doc of campaignsSnapshot.docs) {
      const campaignData = doc.data();
      const createdAt = campaignData.created_at?.toDate ? campaignData.created_at.toDate() : new Date(campaignData.created_at);
      
      // Check if campaign is from April 6, 7, or 8 (mock data dates)
      const isMockDate = (
        (createdAt >= threeDaysAgo && createdAt < twoDaysAgo) || // April 6
        (createdAt >= twoDaysAgo && createdAt < yesterday) ||     // April 7
        (createdAt >= yesterday && createdAt < today)            // April 8
      );
      
      // Also check for mock data patterns
      const hasMockPatterns = (
        campaignData.campaignName?.includes('Test Campaign') ||
        campaignData.campaignName?.includes('Mock Campaign') ||
        campaignData.source?.includes('test') ||
        campaignData.source?.includes('mock')
      );
      
      if (isMockDate || hasMockPatterns) {
        await db.collection('campaigns').doc(doc.id).delete();
        deletedCampaigns++;
        console.log(`🗑️ Deleted mock campaign: ${doc.id} (${campaignData.campaignName})`);
      }
    }
    
    console.log(`✅ Cleanup complete! Deleted ${deletedOrders} orders and ${deletedCampaigns} campaigns.`);
    
    return NextResponse.json({
      success: true,
      message: 'Mock data cleanup completed successfully',
      deletedRecords: {
        orders: deletedOrders,
        campaigns: deletedCampaigns,
        total: deletedOrders + deletedCampaigns
      },
      realDataPreserved: {
        ordersFromToday: ordersSnapshot.size - deletedOrders,
        campaignsFromToday: campaignsSnapshot.size - deletedCampaigns
      }
    });
    */
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup mock data',
      details: String(error)
    }, { status: 500 });
  }
}
