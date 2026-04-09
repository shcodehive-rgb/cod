export interface Campaign {
  id: string;
  name: string;
  isActive: boolean;
  plannedBudget: number;
  actualSpent: number;
  ordersGenerated: number;
  // Meta API Extensions
  pixelId?: string;
  capiAccessToken?: string;
  metaCampaignId?: string;
  adCode?: string;         // Unique tracking code for specific Ads
  conversationsStarted?: number;
}
