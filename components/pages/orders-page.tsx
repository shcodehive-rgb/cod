'use client';

import { useState, useTransition } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrdersTable } from '@/components/orders/orders-table';
import { BlacklistPanel } from '@/components/blacklist-panel';
import { createOrder, updateOrder } from '@/app/actions';
import { Order } from '@/types/order';
import { Campaign } from '@/types/campaign';
import { BlacklistEntry } from '@/types/blacklist';
import { OZONE_CITIES } from '@/data/cities';

interface OrdersPageProps {
  initialOrders: Order[];
  initialCampaigns: Campaign[];
  onOrdersUpdate?: (orders: Order[]) => void;
  blacklist?: BlacklistEntry[];
  isPhoneBlacklisted?: (phone: string) => boolean;
  onAddToBlacklist?: (phone: string, reason: string) => void;
  onRemoveFromBlacklist?: (phone: string) => void;
}

export function OrdersPage({
  initialOrders,
  initialCampaigns,
  onOrdersUpdate,
  blacklist = [],
  isPhoneBlacklisted = () => false,
  onAddToBlacklist = () => {},
  onRemoveFromBlacklist = () => {},
}: OrdersPageProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const filteredOrders = orders.filter(
    (order) =>
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery) ||
      order.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddOrder = () => {
    const newOrder: Order = {
      id: `temp-${Date.now()}`,
      customerName: '',
      phone: '',
      city: '',
      product: '',
      sellingPrice: 0,
      productCost: 0,
      packagingCost: 5,
      shippingFee: 0,
      status: 'pending',
      campaignSource: 'Organic',
    };
    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);
    onOrdersUpdate?.(updatedOrders);
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    setOrders(updatedOrders);
    onOrdersUpdate?.(updatedOrders);

    // If order has a real ID (not temp), save to database
    if (!updatedOrder.id.startsWith('temp-')) {
      startTransition(async () => {
        await updateOrder(updatedOrder.id, updatedOrder);
      });
    } else {
      // First time saving - create the order
      startTransition(async () => {
        const result = await createOrder(updatedOrder);
        if (result.success) {
          // After creating, refetch to get real ID
          // This will be handled by revalidatePath in the Server Action
        }
      });
    }
  };

  return (
    <div className="p-8 h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Orders</h2>
        <p className="text-slate-400">Manage your Cash-On-Delivery orders</p>
      </div>

      {/* Blacklist Panel */}
      {blacklist.length > 0 && (
        <div className="mb-6">
          <BlacklistPanel 
            blacklist={blacklist} 
            onRemove={onRemoveFromBlacklist}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-slate-500" size={18} />
          <Input
            placeholder="Search by customer name, phone, or city..."
            className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={handleAddOrder}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus size={18} />
          Add Order
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-slate-800 rounded-lg bg-slate-900">
        <OrdersTable
          orders={filteredOrders}
          onUpdateOrder={handleUpdateOrder}
          campaigns={initialCampaigns}
          blacklist={blacklist}
          isPhoneBlacklisted={isPhoneBlacklisted}
          onAddToBlacklist={onAddToBlacklist}
        />
      </div>
    </div>
  );
}
