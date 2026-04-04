'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { OrdersPage } from '@/components/pages/orders-page';
import { CampaignsPage } from '@/components/pages/campaigns-page';
import { Order } from '@/types/order';
import { Campaign } from '@/types/campaign';
import { BlacklistEntry } from '@/types/blacklist';

interface DashboardClientProps {
  initialOrders: Order[];
  initialCampaigns: Campaign[];
}

export function DashboardClient({ initialOrders, initialCampaigns }: DashboardClientProps) {
  const [activePage, setActivePage] = useState<'orders' | 'campaigns'>('orders');
  const [orders, setOrders] = useState(initialOrders);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);

  const handleOrdersUpdate = (updatedOrders: Order[]) => {
    setOrders(updatedOrders);
  };

  const handleCampaignsUpdate = (updatedCampaigns: Campaign[]) => {
    setCampaigns(updatedCampaigns);
  };

  const isPhoneBlacklisted = (phone: string): boolean => {
    return blacklist.some(entry => entry.phone === phone);
  };

  const addToBlacklist = (phone: string, reason: string) => {
    if (!isPhoneBlacklisted(phone)) {
      setBlacklist([
        ...blacklist,
        {
          phone,
          reason,
          dateAdded: new Date().toISOString(),
        },
      ]);
    }
  };

  const removeFromBlacklist = (phone: string) => {
    setBlacklist(blacklist.filter(entry => entry.phone !== phone));
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activePage === 'orders' && (
          <OrdersPage 
            initialOrders={orders} 
            initialCampaigns={campaigns}
            onOrdersUpdate={handleOrdersUpdate}
            blacklist={blacklist}
            isPhoneBlacklisted={isPhoneBlacklisted}
            onAddToBlacklist={addToBlacklist}
            onRemoveFromBlacklist={removeFromBlacklist}
          />
        )}
        {activePage === 'campaigns' && (
          <CampaignsPage 
            initialCampaigns={campaigns}
            initialOrders={orders}
            onCampaignsUpdate={handleCampaignsUpdate}
          />
        )}
      </div>
    </div>
  );
}
