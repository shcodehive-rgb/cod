'use server';

import { revalidatePath } from 'next/cache';
import { db, FieldValue } from '@/lib/firebase';

import { Order } from '@/types/order';
import { Campaign } from '@/types/campaign';
import { BlacklistEntry } from '@/types/blacklist';

// ==================== ORDER ACTIONS ====================

export async function createOrder(data: Partial<Order>) {
  try {
    console.log('🚀 Creating order with data:', data);
    
    // CRITICAL: NEVER accept client-side dates. Always use server timestamp.
    // This prevents any fake/random dates from being stored.
    const orderData = {
      ...data,
      created_at: FieldValue.serverTimestamp(), // EXACT server time only
      updated_at: FieldValue.serverTimestamp(), // EXACT server time only
      fbclid: data.fbclid || null,
      eventId: data.eventId || null,
    };
    
    // Remove any client-side created_at that might have been passed
    delete (orderData as any).clientCreatedAt;
    delete (orderData as any).manualDate;
    
    // Direct Firestore Admin SDK usage
    const result = await db.collection('orders').add(orderData);
    
    console.log('✅ Order created successfully with REAL timestamp:', result.id);
    revalidatePath('/');
    return { success: true, data: { ...orderData, id: result.id } };
  } catch (error) {
    console.error('❌ Failed to create order:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateOrder(id: string, data: Partial<Order>) {
  try {
    console.log('🔄 Updating order:', id, 'with data:', data);
    
    await db.collection('orders').doc(id).update({
      ...data,
      updated_at: FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Order updated successfully');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update order:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteOrder(id: string) {
  try {
    console.log('🚮 Deleting order:', id);
    
    await db.collection('orders').doc(id).delete();
    
    console.log('✅ Order deleted successfully');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete order:', error);
    return { success: false, error: String(error) };
  }
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    console.log('🔄 Fetching orders from Firebase Admin SDK...');
    
    const snapshot = await db.collection('orders').get();
    
    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // CRITICAL: Only use actual server timestamps, never fallback to current time
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || null,
      } as unknown as Order;
    });
    
    console.log('✅ Orders fetched successfully:', orders.length, 'orders');
    return orders;
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error);
    return [];
  }
}

// ==================== CAMPAIGN ACTIONS ====================

export async function createCampaign(data: Partial<Campaign>) {
  try {
    console.log('🚀 Creating campaign with data:', data);
    
    const campaignData = {
      ...data,
      orders_generated: 0,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    
    // Direct Firestore Admin SDK usage
    const result = await db.collection('campaigns').add(campaignData);
    
    console.log('✅ Campaign created successfully:', result.id);
    revalidatePath('/');
    return { success: true, data: { ...campaignData, id: result.id } };
  } catch (error) {
    console.error('❌ Failed to create campaign:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateCampaign(id: string, data: Partial<Campaign>) {
  try {
    console.log('🔄 Updating campaign:', id, 'with data:', data);
    
    await db.collection('campaigns').doc(id).update({
      ...data,
      updated_at: FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Campaign updated successfully');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update campaign:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateCampaignSpend(campaignId: string, newSpend: number) {
  try {
    console.log('🔄 Updating campaign spend:', campaignId, 'with new spend:', newSpend);
    
    await db.collection('campaigns').doc(campaignId).update({
      actual_spent: newSpend,
      updated_at: FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Campaign spend updated successfully');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update campaign spend:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteCampaign(id: string) {
  try {
    console.log('🚮 Deleting campaign:', id);
    
    await db.collection('campaigns').doc(id).delete();
    
    console.log('✅ Campaign deleted successfully');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete campaign:', error);
    return { success: false, error: String(error) };
  }
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  try {
    console.log('🔄 Fetching campaigns from Firebase Admin SDK...');
    
    const snapshot = await db.collection('campaigns').get();
    
    const campaigns = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // CRITICAL: Only use actual server timestamps, never fallback to current time
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || null,
      } as unknown as Campaign;
    });
    
    console.log('✅ Campaigns fetched successfully:', campaigns.length, 'campaigns');
    return campaigns;
  } catch (error) {
    console.error('❌ Failed to fetch campaigns:', error);
    return [];
  }
}

// ==================== BLACKLIST ACTIONS ====================

export async function addToBlacklist(data: Omit<BlacklistEntry, 'dateAdded'>) {
  try {
    console.log('🚀 Adding to blacklist:', data);
    
    const blacklistData = {
      ...data,
      dateAdded: FieldValue.serverTimestamp(),
    };
    
    // Direct Firestore Admin SDK usage
    const result = await db.collection('blacklist').add(blacklistData);
    
    console.log('✅ Added to blacklist successfully:', result.id);
    revalidatePath('/');
    return { success: true, data: { ...blacklistData, id: result.id } };
  } catch (error) {
    console.error('❌ Failed to add to blacklist:', error);
    return { success: false, error: String(error) };
  }
}

export async function removeFromBlacklist(phone: string) {
  try {
    console.log('🚮 Removing from blacklist:', phone);
    
    // Find document by phone number
    const snapshot = await db.collection('blacklist').where('phone', '==', phone).get();
    
    if (snapshot.empty) {
      return { success: false, error: 'Phone number not found in blacklist' };
    }
    
    // Delete all matching documents (should be just one)
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log('✅ Removed from blacklist successfully');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to remove from blacklist:', error);
    return { success: false, error: String(error) };
  }
}

export async function fetchBlacklist(): Promise<BlacklistEntry[]> {
  try {
    console.log('🔄 Fetching blacklist from Firebase Admin SDK...');
    
    const snapshot = await db.collection('blacklist').get();
    
    const blacklist = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        phone: data.phone,
        reason: data.reason,
        dateAdded: data.dateAdded?.toDate?.()?.toISOString() || data.dateAdded || new Date().toISOString(),
      } as BlacklistEntry;
    });
    
    console.log('✅ Blacklist fetched successfully:', blacklist.length, 'entries');
    return blacklist;
  } catch (error) {
    console.error('❌ Failed to fetch blacklist:', error);
    return [];
  }
}

export async function isPhoneBlacklisted(phone: string): Promise<boolean> {
  try {
    const snapshot = await db.collection('blacklist').where('phone', '==', phone).get();
    return !snapshot.empty;
  } catch (error) {
    console.error('❌ Failed to check blacklist status:', error);
    return false;
  }
}
