'use server';

import { revalidatePath } from 'next/cache';

// 🚀 هانا رجعت ليك الداتا ديالك من التصاور اللي صيفطتي ليا!
const ordersDb: any[] = [
  { id: '1', customerName: 'reda', phone: '664609889', city: 'Douar Boumaiz', product: 'Ceinture de cheville', sellingPrice: 149, productCost: 50, packagingCost: 5, shippingFee: 45, campaignSource: 'bismiallh tawkalto 3la allh', status: 'Delivered', createdAt: new Date() },
  { id: '2', customerName: 'Talhrechet mohammed', phone: '675867222', city: 'Skhirat', product: 'Ceinture de cheville', sellingPrice: 149, productCost: 50, packagingCost: 5, shippingFee: 35, campaignSource: 'حملة إعلانية جديدة بهدف المبيعات', status: 'Delivered', createdAt: new Date() },
  { id: '3', customerName: 'mousa', phone: '772964113', city: 'Moulay Bousselham', product: 'Ceinture de cheville', sellingPrice: 149, productCost: 50, packagingCost: 5, shippingFee: 45, campaignSource: 'حملة إعلانية جديدة بهدف المبيعات', status: 'Delivered', createdAt: new Date() },
  { id: '4', customerName: 'Hamza El hilali', phone: '628087703', city: 'Agadir', product: 'Ceinture de cheville', sellingPrice: 149, productCost: 50, packagingCost: 5, shippingFee: 35, campaignSource: 'حملة إعلانية جديدة بهدف المبيعات', status: 'Delivered', createdAt: new Date() }
];

const campaignsDb: any[] = [
  { id: 'c1', name: 'AD de Prospects', isActive: false, status: 'Stopped', plannedBudget: 50, actualSpent: 41.6, createdAt: new Date() },
  { id: 'c2', name: 'test 2', isActive: false, status: 'Stopped', plannedBudget: 50, actualSpent: 32.6, createdAt: new Date() },
  { id: 'c3', name: 'bismiallh tawkalto 3la allh', isActive: false, status: 'Stopped', plannedBudget: 70, actualSpent: 82.6, createdAt: new Date() },
  { id: 'c4', name: 'Super Adsorption', isActive: false, status: 'Stopped', plannedBudget: 50, actualSpent: 9.6, createdAt: new Date() },
  { id: 'c5', name: 'حملة إعلانية جديدة بهدف المبيعات', isActive: false, status: 'Stopped', plannedBudget: 100, actualSpent: 173.1, createdAt: new Date() },
  { id: 'c6', name: '50', isActive: false, status: 'Stopped', plannedBudget: 50, actualSpent: 130, createdAt: new Date() }
];

// ==================== ORDER ACTIONS ====================

export async function createOrder(data: any) {
  try {
    const newOrder = { id: `order-${Date.now()}`, ...data, createdAt: new Date() };
    ordersDb.push(newOrder);
    revalidatePath('/');
    return { success: true, data: newOrder };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateOrder(id: string, data: any) {
  try {
    const index = ordersDb.findIndex(o => o.id === id);
    if (index !== -1) ordersDb[index] = { ...ordersDb[index], ...data };
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteOrder(id: string) {
  try {
    const index = ordersDb.findIndex(o => o.id === id);
    if (index !== -1) ordersDb.splice(index, 1);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function fetchOrders() {
  return ordersDb;
}

// ==================== CAMPAIGN ACTIONS ====================

export async function createCampaign(data: any) {
  try {
    const newCampaign = { id: `campaign-${Date.now()}`, ...data, ordersGenerated: 0, createdAt: new Date() };
    campaignsDb.push(newCampaign);
    revalidatePath('/');
    return { success: true, data: newCampaign };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateCampaign(id: string, data: any) {
  try {
    const index = campaignsDb.findIndex(c => c.id === id);
    if (index !== -1) campaignsDb[index] = { ...campaignsDb[index], ...data };
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateCampaignSpend(campaignId: string, newSpend: number) {
  try {
    const index = campaignsDb.findIndex(c => c.id === campaignId);
    if (index !== -1) campaignsDb[index].actualSpent = newSpend;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteCampaign(id: string) {
  try {
    const index = campaignsDb.findIndex(c => c.id === id);
    if (index !== -1) campaignsDb.splice(index, 1);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function fetchCampaigns() {
  return campaignsDb;
}