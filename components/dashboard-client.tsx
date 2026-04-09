'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { OrdersPage } from '@/components/pages/orders-page';
import { CampaignsPage } from '@/components/pages/campaigns-page';
import WhatsAppPage from '@/components/pages/whatsapp-page';
import { Order } from '@/types/order';
import { Campaign } from '@/types/campaign';
import { BlacklistEntry } from '@/types/blacklist';

interface DashboardClientProps {
  initialOrders: Order[];
  initialCampaigns: Campaign[];
}

export function DashboardClient({ initialOrders, initialCampaigns }: DashboardClientProps) {
  const [activePage, setActivePage] = useState<'orders' | 'campaigns' | 'whatsapp'>('orders');
  const [orders, setOrders] = useState(initialOrders);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);

  // Fetch blacklist on component mount
  useEffect(() => {
    const fetchBlacklist = async () => {
      try {
        const response = await fetch('/api/blacklist');
        const result = await response.json();
        
        if (result.success) {
          setBlacklist(result.data);
        }
      } catch (error) {
        console.error('Error fetching blacklist:', error);
      }
    };

    fetchBlacklist();
  }, []);

  const handleOrdersUpdate = (updatedOrders: Order[]) => {
    setOrders(updatedOrders);
  };

  const handleCampaignsUpdate = (updatedCampaigns: Campaign[]) => {
    setCampaigns(updatedCampaigns);
  };

  const isPhoneBlacklisted = (phone: string): boolean => {
    return blacklist.some(entry => entry.phone === phone);
  };

  const addToBlacklist = async (phone: string, reason: string) => {
    if (!isPhoneBlacklisted(phone)) {
      try {
        const response = await fetch('/api/blacklist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone, reason }),
        });

        const result = await response.json();
        
        if (result.success) {
          setBlacklist([
            ...blacklist,
            {
              phone,
              reason,
              dateAdded: new Date().toISOString(),
            },
          ]);
          alert('Customer added to blacklist successfully!');
        } else {
          alert('Failed to add to blacklist: ' + result.error);
        }
      } catch (error) {
        console.error('Error adding to blacklist:', error);
        alert('Failed to add to blacklist. Please try again.');
      }
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
        {activePage === 'whatsapp' && (
          <WhatsAppPage />
        )}
      </div>
    </div>
  );
}
