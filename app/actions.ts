'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types/order';
import { Campaign } from '@/types/campaign';

// ==================== ORDER ACTIONS ====================

export async function createOrder(data: Partial<Order>) {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        ...data,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    revalidatePath('/');
    return { success: true, data: order };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateOrder(id: string, data: Partial<Order>) {
  try {
    const { error } = await supabase
      .from('orders')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteOrder(id: string) {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

// ==================== CAMPAIGN ACTIONS ====================

export async function createCampaign(data: Partial<Campaign>) {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert([{
        ...data,
        orders_generated: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    revalidatePath('/');
    return { success: true, data: campaign };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateCampaign(id: string, data: Partial<Campaign>) {
  try {
    const { error } = await supabase
      .from('campaigns')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateCampaignSpend(campaignId: string, newSpend: number) {
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({ actual_spent: newSpend })
      .eq('id', campaignId);
    
    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteCampaign(id: string) {
  try {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }
}