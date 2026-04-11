'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { Campaign, AdCopy } from '@/types/campaign';
import { Order } from '@/types/order';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface CampaignRowProps {
  campaign: Campaign;
  onUpdate: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  orders?: Order[];
}

export function CampaignRow({ campaign, onUpdate, onDelete, orders = [] }: CampaignRowProps) {
  const [newAdCopyName, setNewAdCopyName] = useState('');
  const [newAdCopyId, setNewAdCopyId] = useState('');
  
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

      {/* ── AD COPIES COLUMN ── */}
      <TableCell>
        <div className="flex flex-col gap-2 min-w-[280px]">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Ad Copies (Creatives)</span>
            <span className="text-[9px] text-slate-400">{campaign.adCopies?.length || 0}</span>
          </div>
          
          {/* Existing Ad Copies */}
          <div className="max-h-32 overflow-y-auto space-y-1">
            {(campaign.adCopies || []).map((adCopy) => (
              <div key={adCopy.id} className="flex items-center gap-1 bg-slate-900 rounded p-1">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-200 truncate">{adCopy.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">ID: {adCopy.adId}</div>
                </div>
                <Button
                  onClick={() => handleRemoveAdCopy(adCopy.id)}
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                >
                  <Trash2 size={10} />
                </Button>
              </div>
            ))}
          </div>
          
          {/* Add New Ad Copy */}
          <div className="space-y-1 pt-1 border-t border-slate-800">
            <Input
              value={newAdCopyName}
              onChange={(e) => setNewAdCopyName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-xs h-6"
              placeholder="Ad Copy Name"
            />
            <Input
              value={newAdCopyId}
              onChange={(e) => setNewAdCopyId(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-xs h-6"
              placeholder="Facebook Ad ID"
            />
            <Button
              onClick={handleAddAdCopy}
              disabled={!newAdCopyName.trim() || !newAdCopyId.trim()}
              size="sm"
              className="h-6 text-xs bg-green-700 hover:bg-green-600 text-white w-full gap-1"
            >
              <Plus size={10} />
              Add Ad Copy
            </Button>
          </div>
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
