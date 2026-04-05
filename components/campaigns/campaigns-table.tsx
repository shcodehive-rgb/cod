'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CampaignRow } from './campaign-row';
import { Campaign } from '@/types/campaign';
import { Order } from '@/types/order';

interface CampaignsTableProps {
  campaigns: Campaign[];
  onUpdateCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (id: string) => void;
  orders?: Order[];
}

export function CampaignsTable({ campaigns, onUpdateCampaign, onDeleteCampaign, orders = [] }: CampaignsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-800 hover:bg-slate-800/50">
          <TableHead className="text-slate-300 font-semibold">Campaign Name</TableHead>
          <TableHead className="text-slate-300 font-semibold">Status</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right">Planned Budget (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right">Actual Spent (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right">Break-Even (Orders)</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right">Delivered Orders</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right">Net ROI (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-slate-400">
              No campaigns yet. Create your first campaign to get started.
            </TableCell>
          </TableRow>
        ) : (
          campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              onUpdate={onUpdateCampaign}
              onDelete={onDeleteCampaign}
              orders={orders}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
