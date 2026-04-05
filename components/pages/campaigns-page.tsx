'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignsTable } from '@/components/campaigns/campaigns-table';
import { SummaryMetrics } from '@/components/summary-metrics';
import { createCampaign, updateCampaign, deleteCampaign } from '@/app/actions';
import { Campaign } from '@/types/campaign';
import { Order } from '@/types/order';

interface CampaignsPageProps {
  initialCampaigns: Campaign[];
  initialOrders: Order[];
  onCampaignsUpdate?: (campaigns: Campaign[]) => void;
}

export function CampaignsPage({ initialCampaigns, initialOrders, onCampaignsUpdate }: CampaignsPageProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [isPending, startTransition] = useTransition();

  const handleAddCampaign = () => {
    const newCampaign: Campaign = {
      id: `temp-${Date.now()}`,
      name: '',
      isActive: true,
      plannedBudget: 0,
      actualSpent: 0,
      ordersGenerated: 0,
    };
    const updatedCampaigns = [...campaigns, newCampaign];
    setCampaigns(updatedCampaigns);
    onCampaignsUpdate?.(updatedCampaigns);
  };

  const handleUpdateCampaign = (updatedCampaign: Campaign) => {
    const updatedCampaigns = campaigns.map(c => c.id === updatedCampaign.id ? updatedCampaign : c);
    setCampaigns(updatedCampaigns);
    onCampaignsUpdate?.(updatedCampaigns);

    // If campaign has a real ID (not temp), save to database
    if (!updatedCampaign.id.startsWith('temp-')) {
      startTransition(async () => {
        await updateCampaign(updatedCampaign.id, updatedCampaign);
      });
    } else {
      // First time saving - create the campaign
      startTransition(async () => {
        await createCampaign(updatedCampaign);
      });
    }
  };

  const handleDeleteCampaign = (id: string) => {
    const updatedCampaigns = campaigns.filter(c => c.id !== id);
    setCampaigns(updatedCampaigns);
    onCampaignsUpdate?.(updatedCampaigns);

    // If campaign has a real ID (not temp), delete from database
    if (!id.startsWith('temp-')) {
      startTransition(async () => {
        await deleteCampaign(id);
      });
    }
  };

  return (
    <div className="p-8 h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Ad Campaigns</h2>
        <p className="text-slate-400">Track your Facebook advertising campaigns and ROI</p>
      </div>

      {/* Summary Metrics */}
      <SummaryMetrics campaigns={campaigns} orders={initialOrders} />

      {/* Toolbar */}
      <div className="flex gap-4 mb-6">
        <Button
          onClick={handleAddCampaign}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus size={18} />
          New Campaign
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-slate-800 rounded-lg bg-slate-900">
        <CampaignsTable
          campaigns={campaigns}
          onUpdateCampaign={handleUpdateCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          orders={initialOrders}
        />
      </div>
    </div>
  );
}
