'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Campaign } from '@/types/campaign';
import { Order } from '@/types/order';
import { cn } from '@/lib/utils';

interface CampaignRowProps {
  campaign: Campaign;
  onUpdate: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  orders?: Order[];
}

export function CampaignRow({ campaign, onUpdate, onDelete, orders = [] }: CampaignRowProps) {
  const campaignOrders = orders.filter(
    o => o.status === 'delivered' && o.campaignSource === campaign.id
  );
  
  const campaignOrdersProfit = campaignOrders.reduce((sum, o) => {
    return sum + (o.sellingPrice - o.productCost - o.packagingCost - o.shippingFee);
  }, 0);

  const netROI = campaignOrdersProfit - (parseFloat(campaign.actualSpent?.toString()) || 0);
  const avgOrderProfit = campaignOrders.length > 0 ? campaignOrdersProfit / campaignOrders.length : 0;
  const actualSpent = parseFloat(campaign.actualSpent?.toString()) || 0;
  const breakEven = avgOrderProfit > 0
    ? Math.ceil(actualSpent / avgOrderProfit)
    : (actualSpent > 0 ? 'N/A' : '0');

  const handleFieldChange = (field: keyof Campaign, value: any) => {
    onUpdate({ ...campaign, [field]: value });
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

  const handleSync = async () => {
    if (!campaign.metaCampaignId) {
      alert('Please set a Meta Campaign ID first.');
      return;
    }
    try {
      const res = await fetch('/api/campaigns/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, metaCampaignId: campaign.metaCampaignId }),
      });
      const data = await res.json();
      if (data.success) {
        handleFieldChange('actualSpent', data.actualSpent);
        handleFieldChange('conversationsStarted', data.conversationsStarted);
        alert(`✅ Synced! Spend: ${data.actualSpent} DH | Msgs: ${data.conversationsStarted}`);
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  return (
    <TableRow className="border-slate-800 hover:bg-slate-800/30">
      <TableCell className="text-slate-200">
        <Input
          value={campaign.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          className="bg-slate-950 border-slate-700 text-white text-sm h-8 w-full"
          placeholder="Campaign name"
        />
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
          onChange={(e) => handleFieldChange('actualSpent', Number(e.target.value) || 0)}
          className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right"
          placeholder="0"
        />
      </TableCell>
      {/* Conversations Started (synced from Meta Insights) */}
      <TableCell className="text-right font-semibold text-blue-400">
        {campaign.conversationsStarted ?? '—'}
      </TableCell>
      <TableCell className="text-right text-slate-200 font-semibold">
        {typeof breakEven === 'string' ? breakEven : breakEven + ' orders'}
      </TableCell>
      <TableCell className={cn('text-right font-bold text-lg', netROI >= 0 ? 'text-green-400' : 'text-red-400')}>
        {netROI >= 0 ? '+' : ''}{netROI.toFixed(2)} DH
      </TableCell>

      {/* ── META INTEGRATION COLUMN ── */}
      <TableCell>
        <div className="flex flex-col gap-1 min-w-[310px]">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Pixel & CAPI Token</span>
          </div>
          <Input
            value={campaign.pixelId || ''}
            onChange={(e) => handleFieldChange('pixelId', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white text-xs h-7"
            placeholder="Pixel ID"
          />
          <Input
            type="password"
            value={campaign.capiAccessToken || ''}
            onChange={(e) => handleFieldChange('capiAccessToken', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white text-xs h-7"
            placeholder="CAPI Access Token"
          />
          
          <div className="flex items-center justify-between px-1 mt-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Ad Attribution (ID)</span>
          </div>
          <Input
            value={campaign.metaCampaignId || ''}
            onChange={(e) => handleFieldChange('metaCampaignId', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white text-xs h-7"
            placeholder="Meta Campaign ID"
          />
          <Input
            value={campaign.adCode || ''}
            onChange={(e) => handleFieldChange('adCode', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white text-xs h-7 border-blue-900/40"
            placeholder="Meta Ad ID (e.g. ad_123)"
          />
          
          <Button
            onClick={handleSync}
            size="sm"
            className="h-7 text-xs bg-blue-700 hover:bg-blue-600 text-white mt-0.5 gap-1 shadow-lg"
          >
            🔄 Sync Meta Data
          </Button>
        </div>
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
  );
}
