/**
 * URL Parameter Auto-population Utility
 * Parses Facebook URL parameters to auto-fill campaign and ad fields
 * 
 * Expected parameters:
 * ?campaign={{campaign.name}}&ad_id={{ad.id}}
 */

import { Campaign, AdCopy } from '@/types/campaign';

export interface ParsedUrlParams {
  campaignName?: string;
  adId?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
}

/**
 * Parse URL parameters from the current page URL
 */
export function parseUrlParams(): ParsedUrlParams {
  if (typeof window === 'undefined') {
    return {};
  }

  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    campaignName: urlParams.get('campaign') || undefined,
    adId: urlParams.get('ad_id') || undefined,
    fbclid: urlParams.get('fbclid') || undefined,
    fbc: urlParams.get('fbc') || undefined,
    fbp: urlParams.get('fbp') || undefined,
  };
}

/**
 * Find campaign by name from campaigns list
 */
export function findCampaignByName(campaigns: Campaign[], campaignName?: string): Campaign | undefined {
  if (!campaignName) return undefined;
  
  return campaigns.find(campaign => 
    campaign.name.toLowerCase().trim() === campaignName.toLowerCase().trim()
  );
}

/**
 * Find ad copy by Facebook Ad ID within a campaign
 */
export function findAdCopyByAdId(campaign: Campaign | undefined, adId?: string): AdCopy | undefined {
  if (!campaign || !adId || !campaign.adCopies) return undefined;
  
  return campaign.adCopies.find(adCopy => 
    adCopy.adId === adId.trim()
  );
}

/**
 * Auto-populate order fields based on URL parameters
 */
export function autoPopulateFromUrlParams(
  campaigns: Campaign[],
  currentOrder: any = {}
): Partial<any> {
  const urlParams = parseUrlParams();
  
  if (!urlParams.campaignName && !urlParams.adId) {
    return {};
  }

  const updates: Partial<any> = {};

  // Find campaign by name
  const campaign = findCampaignByName(campaigns, urlParams.campaignName);
  
  if (campaign) {
    updates.campaignSource = campaign.id;
    updates.campaignId = campaign.id;
    
    // Find ad copy by Facebook Ad ID
    if (urlParams.adId) {
      const adCopy = findAdCopyByAdId(campaign, urlParams.adId);
      if (adCopy) {
        updates.adCopyId = adCopy.id;
        updates.adCopyName = adCopy.name;
      }
    }
  }

  // Add Facebook tracking parameters
  if (urlParams.fbclid) {
    updates.fbclid = urlParams.fbclid;
  }
  
  if (urlParams.fbc) {
    updates.fbc = urlParams.fbc;
  }
  
  if (urlParams.fbp) {
    updates.fbp = urlParams.fbp;
  }

  return updates;
}

/**
 * Check if URL parameters suggest auto-population should occur
 */
export function shouldAutoPopulate(): boolean {
  const params = parseUrlParams();
  return !!(params.campaignName || params.adId);
}

/**
 * Get a user-friendly message about auto-population
 */
export function getAutoPopulationMessage(): string | null {
  const params = parseUrlParams();
  
  if (!params.campaignName && !params.adId) {
    return null;
  }

  const messages: string[] = [];
  
  if (params.campaignName) {
    messages.push(`Campaign: ${params.campaignName}`);
  }
  
  if (params.adId) {
    messages.push(`Ad ID: ${params.adId}`);
  }
  
  return `Auto-populated from URL: ${messages.join(', ')}`;
}
