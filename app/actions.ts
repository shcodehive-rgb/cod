'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types/order';
import { Campaign } from '@/types/campaign';

// ==================== ORDER ACTIONS ====================

export async function createOrder(data: Partial<Order>) {
  try {
    console.log('🚀 Creating order with data:', data);
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        ...data,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase error creating order:', error);
      throw error;
    }
    
    console.log('✅ Order created successfully:', order);
    revalidatePath('/');
    return { success: true, data: order };
  } catch (error) {
    console.error('❌ Failed to create order:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateOrder(id: string, data: Partial<Order>) {
  try {
    console.log('🔄 Updating order:', id, 'with data:', data);
    
    const { error } = await supabase
      .from('orders')
      .update(data)
      .eq('id', id);
    
    if (error) {
      console.error('❌ Supabase error updating order:', error);
      throw error;
    }
    
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
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Supabase error deleting order:', error);
      throw error;
    }
    
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
    console.log('🔄 Fetching orders from Supabase...');
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase error fetching orders:', error);
      throw error;
    }
    
    console.log('✅ Orders fetched successfully:', data?.length || 0, 'orders');
    return data || [];
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error);
    return [];
  }
}

// ==================== CAMPAIGN ACTIONS ====================

export async function createCampaign(data: Partial<Campaign>) {
  try {
    console.log('🚀 Creating campaign with data:', data);
    
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert([{
        ...data,
        orders_generated: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase error creating campaign:', error);
      throw error;
    }
    
    console.log('✅ Campaign created successfully:', campaign);
    revalidatePath('/');
    return { success: true, data: campaign };
  } catch (error) {
    console.error('❌ Failed to create campaign:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateCampaign(id: string, data: Partial<Campaign>) {
  try {
    console.log('🔄 Updating campaign:', id, 'with data:', data);
    
    const { error } = await supabase
      .from('campaigns')
      .update(data)
      .eq('id', id);
    
    if (error) {
      console.error('❌ Supabase error updating campaign:', error);
      throw error;
    }
    
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
    
    const { error } = await supabase
      .from('campaigns')
      .update({ actual_spent: newSpend })
      .eq('id', campaignId);
    
    if (error) {
      console.error('❌ Supabase error updating campaign spend:', error);
      throw error;
    }
    
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
    
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Supabase error deleting campaign:', error);
      throw error;
    }
    
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
    console.log('🔄 Fetching campaigns from Supabase...');
    
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase error fetching campaigns:', error);
      throw error;
    }
    
    console.log('✅ Campaigns fetched successfully:', data?.length || 0, 'campaigns');
    return data || [];
  } catch (error) {
    console.error('❌ Failed to fetch campaigns:', error);
    return [];
  }
}