export interface AdCopy {
  id: string;
  name: string;
  adId: string; // Facebook Ad ID retrieved from Meta
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  isActive: boolean;
  plannedBudget: number;
  actualSpent: number;
  ordersGenerated: number;
  adCopies: AdCopy[]; // Array of ad creatives under this campaign
  // Meta API Extensions
  pixelId?: string;
  capiAccessToken?: string;
  metaCampaignId?: string;
  adCode?: string;         // Unique tracking code for specific Ads (deprecated, use adCopies)
  conversationsStarted?: number;
  impressions?: number;
  linkClicks?: number;
  costPerMessage?: number;
  lastSync?: string;
}
