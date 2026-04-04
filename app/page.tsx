import { fetchOrders, fetchCampaigns } from './actions';
import { DashboardClient } from '@/components/dashboard-client';

export default async function DashboardPage() {
  // Fetch real data from Prisma
  const [orders, campaigns] = await Promise.all([
    fetchOrders(),
    fetchCampaigns(),
  ]);

  return (
    <DashboardClient 
      initialOrders={orders} 
      initialCampaigns={campaigns} 
    />
  );
}
