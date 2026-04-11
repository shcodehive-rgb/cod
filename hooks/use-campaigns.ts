import { useState } from 'react';
import { Campaign } from '@/types/campaign';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const addCampaign = () => {
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: '',
      isActive: true,
      plannedBudget: 0,
      actualSpent: 0,
      ordersGenerated: 0,
      adCopies: [],
    };
    setCampaigns([...campaigns, newCampaign]);
  };

  const updateCampaign = (updatedCampaign: Campaign) => {
    setCampaigns(campaigns.map(campaign => campaign.id === updatedCampaign.id ? updatedCampaign : campaign));
  };

  return { campaigns, addCampaign, updateCampaign };
}
