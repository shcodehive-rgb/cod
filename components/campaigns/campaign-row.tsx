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
  // Calculate profit from delivered orders linked to this campaign
  const campaignOrders = orders.filter(
    o => o.status === 'delivered' && o.campaignSource === campaign.id
  );
  
  const campaignOrdersProfit = campaignOrders.reduce((sum, o) => {
    const orderNetProfit = o.sellingPrice - o.productCost - o.packagingCost - o.shippingFee;
    return sum + orderNetProfit;
  }, 0);

  // Campaign ROI = Sum of delivered order profits - Actual Spent
  const netROI = campaignOrdersProfit - (parseFloat(campaign.actualSpent?.toString()) || 0);
  
  // Break-even = How many orders with average profit needed to cover spend
  const avgOrderProfit = campaignOrders.length > 0 
    ? campaignOrdersProfit / campaignOrders.length 
    : 0;
  const actualSpent = parseFloat(campaign.actualSpent?.toString()) || 0;
  const breakEven = avgOrderProfit > 0 
    ? Math.ceil(actualSpent / avgOrderProfit)
    : (actualSpent > 0 ? 'N/A' : '0');

  const handleFieldChange = (field: keyof Campaign, value: any) => {
    const updatedCampaign = { ...campaign, [field]: value };
    onUpdate(updatedCampaign);
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
            onCheckedChange={(checked) => handleFieldChange('isActive', checked)}
            className="data-[state=checked]:bg-green-600"
          />
          <span className={cn(
            'text-xs font-medium',
            campaign.isActive ? 'text-green-400' : 'text-slate-500'
          )}>
            {campaign.isActive ? 'Active' : 'Stopped'}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right text-slate-200">
        <Input
          type="number"
          value={parseFloat(campaign.plannedBudget?.toString()) || 0}
          onChange={(e) => handleFieldChange('plannedBudget', parseFloat(e.target.value) || 0)}
          className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right"
          placeholder="0"
        />
      </TableCell>
      <TableCell className="text-right text-slate-200">
        <Input
          type="number"
          value={actualSpent}
          onChange={(e) => handleFieldChange('actualSpent', parseFloat(e.target.value) || 0)}
          className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right"
          placeholder="0"
        />
      </TableCell>
      <TableCell className="text-right text-slate-200 font-semibold">
        {typeof breakEven === 'string' ? breakEven : breakEven + ' orders'}
      </TableCell>
      <TableCell className="text-right text-slate-200">
        <Input
          type="number"
          value={campaignOrders.length}
          disabled
          className="bg-slate-800 border-slate-700 text-slate-300 text-sm h-8 text-right cursor-not-allowed"
          placeholder="0"
        />
      </TableCell>
      <TableCell className={cn(
        'text-right font-bold text-lg',
        netROI >= 0 ? 'text-green-400' : 'text-red-400'
      )}>
        {netROI >= 0 ? '+' : ''}{netROI.toFixed(2)} DH
      </TableCell>
      <TableCell className="text-slate-200">
        <Button
          onClick={() => onDelete(campaign.id)}
          variant="outline"
          size="sm"
          className="border-red-700/30 text-red-400 hover:bg-red-950/30 text-xs gap-1"
        >
          <Trash2 size={14} />
          Delete
        </Button>
      </TableCell>
    </TableRow>
  );
}
