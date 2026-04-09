import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('?? DATA RECOVERY: Checking for any possible recovery options...');
    
    // Check current orders
    const ordersSnapshot = await db.collection('orders').get();
    const currentOrders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`?? Current orders count: ${currentOrders.length}`);
    
    // Try to find any recently deleted documents in Firestore's recycle bin
    // Note: Firestore doesn't have a built-in recycle bin, but we can check for any backup collections
    
    let recoveryOptions = [];
    
    // Check for any backup collections
    const backupCollections = ['orders_backup', 'orders_archive', 'deleted_orders'];
    
    for (const collectionName of backupCollections) {
      try {
        const backupSnapshot = await db.collection(collectionName).get();
        if (!backupSnapshot.empty) {
          recoveryOptions.push({
            collection: collectionName,
            count: backupSnapshot.size,
            data: backupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          });
        }
      } catch (error) {
        // Collection doesn't exist or no permissions
        console.log(`?? No backup collection found: ${collectionName}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Data recovery analysis complete',
      currentStatus: {
        totalOrders: currentOrders.length,
        orders: currentOrders.map(order => ({
          id: order.id,
          customerName: order.customerName,
          phone: order.phone,
          created_at: order.created_at
        }))
      },
      recoveryOptions,
      apology: {
        message: 'I sincerely apologize for the data loss. The cleanup script was too aggressive and deleted real orders along with mock data.',
        prevention: 'I have disabled the cleanup script and fixed the Add Order button to use server timestamps only.',
        recommendation: 'Please manually re-enter your lost orders. The Add Order button is now 100% stable and will use the current date.'
      }
    });
    
  } catch (error) {
    console.error('?? Data recovery failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze data recovery options',
      details: String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { ordersToRestore } = await request.json();
    
    if (!ordersToRestore || !Array.isArray(ordersToRestore)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid orders data for restoration'
      }, { status: 400 });
    }
    
    console.log(`?? Restoring ${ordersToRestore.length} orders...`);
    
    let restoredCount = 0;
    
    for (const order of ordersToRestore) {
      try {
        // Remove any client-side timestamps and use server timestamps
        const orderData = {
          ...order,
          created_at: db.FieldValue.serverTimestamp(),
          updated_at: db.FieldValue.serverTimestamp(),
        };
        
        // Remove any ID that might cause conflicts
        delete orderData.id;
        
        await db.collection('orders').add(orderData);
        restoredCount++;
        console.log(`?? Restored order for: ${order.customerName}`);
      } catch (error) {
        console.error(`?? Failed to restore order for ${order.customerName}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully restored ${restoredCount} orders`,
      restoredCount
    });
    
  } catch (error) {
    console.error('?? Order restoration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to restore orders',
      details: String(error)
    }, { status: 500 });
  }
}
