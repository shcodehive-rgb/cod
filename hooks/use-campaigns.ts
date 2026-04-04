import { useState } from 'react';
import { Campaign } from '@/types/campaign';

const initialCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Sale Campaign',
    isActive: true,
    plannedBudget: 300,
    actualSpent: 200,
    ordersGenerated: 8,
  },
  {
    id: '2',
    name: 'Ramadan Special',
    isActive: false,
    plannedBudget: 250,
    actualSpent: 150,
    ordersGenerated: 5,
  },
];

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);

  const addCampaign = () => {
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: '',
      isActive: true,
      plannedBudget: 0,
      actualSpent: 0,
      ordersGenerated: 0,
    };
    setCampaigns([...campaigns, newCampaign]);
  };

  const updateCampaign = (updatedCampaign: Campaign) => {
    setCampaigns(campaigns.map(campaign => campaign.id === updatedCampaign.id ? updatedCampaign : campaign));
  };

  return { campaigns, addCampaign, updateCampaign };
}
