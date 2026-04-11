'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Campaign, AdCopy } from '@/types/campaign';
import { Order } from '@/types/order';
import { cn } from '@/lib/utils';

interface ExpandableCampaignRowProps {
  campaign: Campaign;
  onUpdate: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  orders?: Order[];
}

export function ExpandableCampaignRow({ campaign, onUpdate, onDelete, orders = [] }: ExpandableCampaignRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newAdCopyName, setNewAdCopyName] = useState('');
  const [newAdCopyId, setNewAdCopyId] = useState('');
  
  const campaignOrders = orders.filter(
    o => (o.status === 'delivered' || o.status === 'confirmed') && o.campaignSource === campaign.id
  );
  
    
  const campaignOrdersProfit = campaignOrders.reduce((sum, o) => {
    return sum + (o.sellingPrice - o.productCost - o.packagingCost - o.shippingFee);
  }, 0);

  const netROI = campaignOrdersProfit - (parseFloat(campaign.actualSpent?.toString()) || 0);
  const avgOrderProfit = campaignOrders.length > 0 ? campaignOrdersProfit / campaignOrders.length : 0;
  const actualSpent = parseFloat(campaign.actualSpent?.toString()) || 0;
  const breakEven = avgOrderProfit > 0
    ? Math.ceil(actualSpent / avgOrderProfit)
    : 0;

  // Calculate aggregate totals (campaign-level metrics represent totals from all ad copies)
  const aggregateTotals = {
    totalImpressions: campaign.impressions || 0,
    totalLinkClicks: campaign.linkClicks || 0,
    totalConversations: campaign.conversationsStarted || 0,
    totalAdCopies: (campaign.adCopies || []).length
  };

  // Calculate efficiency metrics
  const impressions = campaign.impressions || 0;
  const clicks = campaign.linkClicks || 0;
  const messages = campaign.conversationsStarted || 0;
  
  // Get all Ad Copy IDs from this campaign
  const campaignAdCopyIds = (campaign.adCopies || []).map(adCopy => adCopy.id);
  
  // Count confirmed orders: either directly linked to campaign OR linked to any of its Ad Copies
  const confirmedOrders = orders.filter(o => {
    if (o.status !== 'confirmed') return false;
    
    // Direct campaign assignment
    if (o.campaignId === campaign.id) return true;
    
    // Ad Copy assignment - check if order's adCopyId matches any ad copy in this campaign
    if (o.adCopyId && campaignAdCopyIds.includes(o.adCopyId)) return true;
    
    return false;
  }).length;
  
  const deliveredOrders = campaignOrders.length;

  // Calculate CPA (Cost per Purchase) - basé sur les commandes confirmées
  const cpa = confirmedOrders > 0 ? actualSpent / confirmedOrders : 0;

  // CTR%: (Clicks / Impressions) * 100
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  
  // Lead Rate%: (Messages / Clicks) * 100
  const leadRate = clicks > 0 ? (messages / clicks) * 100 : 0;
  
  // Confirmation Rate%: (Confirmed Orders / Messages) * 100
  const confirmationRate = messages > 0 ? (confirmedOrders / messages) * 100 : 0;
  
  // Delivery Rate%: (Delivered Orders / Confirmed Orders) * 100
  const deliveryRate = confirmedOrders > 0 ? (deliveredOrders / confirmedOrders) * 100 : 0;

  // Helper function to calculate metrics for individual ad copies
  const calculateAdCopyMetrics = (adCopyId: string) => {
    const adCopyOrders = orders.filter(o => o.adCopyId === adCopyId);
    const adCopyConfirmedOrders = adCopyOrders.filter(o => o.status === 'confirmed').length;
    const adCopyDeliveredOrders = adCopyOrders.filter(o => o.status === 'delivered').length;
    
    // For individual ad copies, we'd need to track impressions and clicks per ad copy
    // For now, we'll use campaign-level metrics as a proxy (in a real implementation, 
    // you'd track these per ad copy from Meta API)
    const adCopyImpressions = campaign.impressions ? Math.floor(campaign.impressions / (campaign.adCopies?.length || 1)) : 0;
    const adCopyClicks = campaign.linkClicks ? Math.floor(campaign.linkClicks / (campaign.adCopies?.length || 1)) : 0;
    const adCopyMessages = campaign.conversationsStarted ? Math.floor(campaign.conversationsStarted / (campaign.adCopies?.length || 1)) : 0;
    
    const adCopyCtr = adCopyImpressions > 0 ? (adCopyClicks / adCopyImpressions) * 100 : 0;
    const adCopyLeadRate = adCopyClicks > 0 ? (adCopyMessages / adCopyClicks) * 100 : 0;
    const adCopyConfirmationRate = adCopyMessages > 0 ? (adCopyConfirmedOrders / adCopyMessages) * 100 : 0;
    const adCopyDeliveryRate = adCopyConfirmedOrders > 0 ? (adCopyDeliveredOrders / adCopyConfirmedOrders) * 100 : 0;
    
    return {
      impressions: adCopyImpressions,
      clicks: adCopyClicks,
      messages: adCopyMessages,
      confirmedOrders: adCopyConfirmedOrders,
      deliveredOrders: adCopyDeliveredOrders,
      ctr: adCopyCtr,
      leadRate: adCopyLeadRate,
      confirmationRate: adCopyConfirmationRate,
      deliveryRate: adCopyDeliveryRate
    };
  };

  const handleFieldChange = (field: keyof Campaign, value: any) => {
    onUpdate({ ...campaign, [field]: value });
  };

  const handleAddAdCopy = () => {
    if (newAdCopyName.trim() && newAdCopyId.trim()) {
      const newAdCopy: AdCopy = {
        id: `adcopy-${Date.now()}`,
        name: newAdCopyName.trim(),
        adId: newAdCopyId.trim(),
        created_at: new Date().toISOString(),
      };
      
      const updatedAdCopies = [...(campaign.adCopies || []), newAdCopy];
      onUpdate({ ...campaign, adCopies: updatedAdCopies });
      
      setNewAdCopyName('');
      setNewAdCopyId('');
    }
  };

  const handleRemoveAdCopy = (adCopyId: string) => {
    const updatedAdCopies = (campaign.adCopies || []).filter(ac => ac.id !== adCopyId);
    onUpdate({ ...campaign, adCopies: updatedAdCopies });
  };

  const handleToggle = async (checked: boolean) => {
    handleFieldChange('isActive', checked);
    try {
      await fetch('/api/campaigns/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          isActive: checked,
          metaCampaignId: campaign.metaCampaignId,
        }),
      });
    } catch (err) {
      console.error('Failed to toggle campaign on Meta:', err);
    }
  };

  const handleSyncInsights = async () => {
    if (!campaign.metaCampaignId) {
      alert('Please set a Meta Campaign ID first.');
      return;
    }
    
    try {
      const response = await fetch('/api/campaigns/sync-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaignId: campaign.id, 
          metaCampaignId: campaign.metaCampaignId 
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        handleFieldChange('actualSpent', data.actualSpent);
        handleFieldChange('conversationsStarted', data.conversationsStarted);
        handleFieldChange('impressions', data.impressions);
        handleFieldChange('linkClicks', data.linkClicks);
        handleFieldChange('costPerMessage', data.costPerMessage);
        handleFieldChange('lastSync', data.lastSync);
        
        alert(`✅ Synced! Spend: ${data.actualSpent.toFixed(2)} DH | Msgs: ${data.conversationsStarted} | Impressions: ${data.impressions}`);
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Sync error:', err);
      alert('Failed to sync insights. Please try again.');
    }
  };

  return (
    <>
      {/* Main Campaign Row */}
      <TableRow className="border-slate-800 hover:bg-slate-800/30">
        <TableCell className="text-slate-200">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-slate-700"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-slate-400" />
              ) : (
                <ChevronRight size={14} className="text-slate-400" />
              )}
            </Button>
            <Input
              value={campaign.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="bg-slate-950 border-slate-700 text-white text-sm h-8 w-full"
              placeholder="Campaign name"
            />
          </div>
        </TableCell>
        <TableCell className="text-slate-200">
          <div className="flex items-center gap-2">
            <Switch
              checked={campaign.isActive}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-green-600"
            />
            <span className={cn('text-xs font-medium', campaign.isActive ? 'text-green-400' : 'text-slate-500')}>
              {campaign.isActive ? 'Active' : 'Stopped'}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right text-slate-200">
          <Input
            type="number" min="0"
            value={parseFloat(campaign.plannedBudget?.toString()) || 0}
            onChange={(e) => handleFieldChange('plannedBudget', Number(e.target.value) || 0)}
            className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right"
            placeholder="0"
          />
        </TableCell>
        <TableCell className="text-right text-slate-200">
          <Input
            type="number" min="0"
            value={actualSpent}
            readOnly
            className="bg-slate-800 border-slate-600 text-slate-300 text-sm h-8 text-right cursor-not-allowed"
            placeholder="0"
            title="Actual Spent est alimenté automatiquement par l'API Facebook Insights"
          />
        </TableCell>
        <TableCell className="text-right font-semibold text-blue-400">
          <div>
            <div>{campaign.conversationsStarted ?? 0}</div>
            {aggregateTotals.totalAdCopies > 0 && (
              <div className="text-xs text-slate-400">
                {aggregateTotals.totalImpressions} imp | {aggregateTotals.totalAdCopies} ads
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right text-slate-200 font-semibold">
          {confirmedOrders}
        </TableCell>
        <TableCell className={cn('text-right font-bold text-lg', netROI >= 0 ? 'text-green-400' : 'text-red-400')}>
          {netROI >= 0 ? '+' : ''}{netROI.toFixed(2)} DH
        </TableCell>
        <TableCell className="text-right text-slate-200 font-semibold">
          {confirmedOrders > 0 ? `${cpa.toFixed(2)} DH` : '0 DH'}
        </TableCell>
        <TableCell className="text-right text-slate-200 font-semibold">
          {ctr > 0 ? `${ctr.toFixed(1)}%` : '0%'}
        </TableCell>
        <TableCell className="text-right text-slate-200 font-semibold">
          {leadRate > 0 ? `${leadRate.toFixed(1)}%` : '0%'}
        </TableCell>
        <TableCell className="text-right text-slate-200 font-semibold">
          {confirmationRate > 0 ? `${confirmationRate.toFixed(1)}%` : '0%'}
        </TableCell>
        <TableCell className="text-right text-slate-200 font-semibold">
          {deliveryRate > 0 ? `${deliveryRate.toFixed(1)}%` : '0%'}
        </TableCell>
        <TableCell>
          <Button
            onClick={() => onDelete(campaign.id)}
            variant="outline" size="sm"
            className="border-red-700/30 text-red-400 hover:bg-red-950/30 text-xs gap-1"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </TableCell>
      </TableRow>

      {/* Expandable Ad Copies Row */}
      {isExpanded && (
        <TableRow className="border-slate-800/50">
          <TableCell colSpan={13} className="p-0">
            <div className="bg-slate-900/50 p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <span className="text-blue-400">📝</span>
                  Campaign Details & Ad Copies ({campaign.adCopies?.length || 0})
                </h4>
                <span className="text-xs text-slate-400">Click to expand campaign details</span>
              </div>

              {/* Meta Integration Section */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mb-4">
                <h5 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="text-blue-400">🔗</span>
                  Meta Integration
                </h5>
                <div className="grid grid-cols-1 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Meta Campaign ID</label>
                    <Input
                      value={campaign.metaCampaignId || ''}
                      onChange={(e) => handleFieldChange('metaCampaignId', e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                      placeholder="Enter Meta Campaign ID"
                    />
                  </div>
                </div>
                
                {/* Metrics Display */}
                {(campaign.impressions || campaign.linkClicks || campaign.costPerMessage) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-slate-900/50 rounded">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">{campaign.impressions || 0}</div>
                      <div className="text-xs text-slate-400">Impressions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">{campaign.linkClicks || 0}</div>
                      <div className="text-xs text-slate-400">Link Clicks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-400">{campaign.costPerMessage ? `${campaign.costPerMessage.toFixed(2)} DH` : '0 DH'}</div>
                      <div className="text-xs text-slate-400">Cost per Message</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-400">{campaign.conversationsStarted || 0}</div>
                      <div className="text-xs text-slate-400">Conversations</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {campaign.lastSync ? `Last sync: ${new Date(campaign.lastSync).toLocaleString()}` : 'Not synced yet'}
                  </div>
                  <Button
                    onClick={handleSyncInsights}
                    size="sm"
                    className="bg-blue-700 hover:bg-blue-600 text-white gap-1"
                    disabled={!campaign.metaCampaignId}
                  >
                    🔄 Sync Insights
                  </Button>
                </div>
              </div>
              
              {/* Existing Ad Copies Grid */}
              {campaign.adCopies && campaign.adCopies.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {campaign.adCopies.map((adCopy) => (
                    <div key={adCopy.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium text-white truncate">{adCopy.name}</h5>
                          <p className="text-xs text-slate-400">ID: {adCopy.adId}</p>
                        </div>
                        <Button
                          onClick={() => handleRemoveAdCopy(adCopy.id)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <div className="text-xs text-slate-400">
                          <span className="text-slate-500">Created:</span> {new Date(adCopy.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Ad Copy */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h5 className="text-sm font-medium text-white mb-3">Add New Ad Copy</h5>
                <div className="flex gap-2">
                  <Input
                    value={newAdCopyName}
                    onChange={(e) => setNewAdCopyName(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-sm"
                    placeholder="Ad Copy Name"
                  />
                  <Input
                    value={newAdCopyId}
                    onChange={(e) => setNewAdCopyId(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-sm"
                    placeholder="Facebook Ad ID"
                  />
                  <Button
                    onClick={handleAddAdCopy}
                    disabled={!newAdCopyName.trim() || !newAdCopyId.trim()}
                    size="sm"
                    className="bg-green-700 hover:bg-green-600 text-white gap-1"
                  >
                    <Plus size={14} />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
