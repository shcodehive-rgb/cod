'use client';

// Fixed: campaigns prop properly destructured and passed to CampaignSelect
import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus } from 'lucide-react';
import { CityCombobox } from './city-combobox';
import { StatusSelect } from './status-select';
import { CampaignSelect } from './campaign-select';
import { Order, OrderStatus } from '@/types/order';
import { Campaign } from '@/types/campaign';
import { OZONE_CITIES } from '@/data/cities';

interface OrderRowProps {
  order: Order;
  onUpdate: (order: Order) => void;
  statusConfig: Record<string, { label: string; className: string }>;
  campaigns: Campaign[];
  isBlacklisted?: boolean;
  onAddToBlacklist?: (phone: string, reason: string) => void;
}

export function OrderRow({ 
  order, 
  onUpdate, 
  statusConfig, 
  campaigns,
  isBlacklisted = false,
  onAddToBlacklist = () => {},
}: OrderRowProps) {
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');

  const handleFieldChange = (field: keyof Order, value: any) => {
    const updatedOrder = { ...order, [field]: value };

    // Auto-fill shipping fee when city changes
    if (field === 'city') {
      const city = OZONE_CITIES.find(c => c.name === value);
      if (city) {
        updatedOrder.shippingFee = city.shipping_fee;
      }
    }

    onUpdate(updatedOrder);
  };

  const handleAddToBlacklist = () => {
    if (blacklistReason.trim()) {
      onAddToBlacklist(order.phone, blacklistReason);
      setBlacklistReason('');
      setShowBlacklistDialog(false);
    }
  };

  // Calculate net profit for this order (only if delivered)
  const netProfit = order.status === 'delivered' 
    ? order.sellingPrice - order.productCost - order.packagingCost - order.shippingFee
    : 0;

  return (
    <>
      <TableRow className={`border-slate-800 hover:bg-slate-800/30 ${
        isBlacklisted ? 'bg-red-950/30 border-l-4 border-l-red-700' : ''
      }`}>
        <TableCell className="text-slate-200">
          <Input
            value={order.customerName}
            onChange={(e) => handleFieldChange('customerName', e.target.value)}
            className="bg-slate-950 border-slate-700 text-white text-sm h-8"
            placeholder="Customer name"
          />
        </TableCell>
        <TableCell className="text-slate-200">
          <div className="flex items-center gap-2">
            {isBlacklisted && <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />}
            <Input
              value={order.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              className="bg-slate-950 border-slate-700 text-white text-sm h-8"
              placeholder="Phone"
            />
          </div>
        </TableCell>
        <TableCell className="text-slate-200">
          <CityCombobox
            value={order.city}
            onSelect={(city) => handleFieldChange('city', city)}
          />
        </TableCell>
        <TableCell className="text-slate-200">
          <Input
            value={order.product}
            onChange={(e) => handleFieldChange('product', e.target.value)}
            className="bg-slate-950 border-slate-700 text-white text-sm h-8"
            placeholder="Product"
          />
        </TableCell>
        <TableCell className="text-right text-slate-200">
          <Input
            type="number"
            value={order.sellingPrice}
            onChange={(e) => handleFieldChange('sellingPrice', parseFloat(e.target.value) || 0)}
            className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right"
            placeholder="0"
          />
        </TableCell>
        <TableCell className="text-right text-slate-200">
          <Input
            type="number"
            value={order.productCost}
            onChange={(e) => handleFieldChange('productCost', parseFloat(e.target.value) || 0)}
            className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right"
            placeholder="0"
          />
        </TableCell>
        <TableCell className="text-right text-slate-200">
          <Input
            type="number"
            value={order.packagingCost}
            onChange={(e) => handleFieldChange('packagingCost', parseFloat(e.target.value) || 5)}
            className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right"
            placeholder="5"
          />
        </TableCell>
        <TableCell className="text-right text-slate-200">
          <Input
            type="number"
            value={order.shippingFee}
            disabled
            className="bg-slate-800 border-slate-700 text-slate-300 text-sm h-8 text-right cursor-not-allowed"
            placeholder="Auto-filled"
          />
        </TableCell>
        <TableCell className="text-slate-200">
          <CampaignSelect
            value={order.campaignSource}
            onSelect={(source) => handleFieldChange('campaignSource', source)}
            campaigns={campaigns}
          />
        </TableCell>
        <TableCell className="text-slate-200">
          <StatusSelect
            value={order.status}
            onSelect={(status) => handleFieldChange('status', status)}
          />
        </TableCell>
        <TableCell className={`text-right font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {netProfit.toFixed(2)} DH
        </TableCell>
      </TableRow>
      
      {/* Blacklist Dialog Row */}
      {showBlacklistDialog && (
        <TableRow className="bg-red-950/20 border-slate-700">
          <TableCell colSpan={11} className="py-4">
            <div className="flex items-center gap-3 bg-red-950/30 p-4 rounded-lg border border-red-700/30">
              <div className="flex-1">
                <p className="text-sm text-red-300 mb-2">Add to blacklist: {order.phone}</p>
                <Input
                  placeholder="Reason (e.g., 'Refused delivery', 'Fake order', 'No answer')"
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-sm h-9 mb-3"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddToBlacklist}
                  disabled={!blacklistReason.trim()}
                  className="bg-red-600 hover:bg-red-700 h-9 text-sm"
                >
                  Confirm
                </Button>
                <Button
                  onClick={() => {
                    setShowBlacklistDialog(false);
                    setBlacklistReason('');
                  }}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9 text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
      
      {/* Add to Blacklist Button Row */}
      {!isBlacklisted && !showBlacklistDialog && (
        <TableRow className="bg-slate-900/50 border-slate-800">
          <TableCell colSpan={11} className="py-2">
            <Button
              onClick={() => setShowBlacklistDialog(true)}
              variant="outline"
              size="sm"
              className="border-red-700/30 text-red-400 hover:bg-red-950/30 text-xs gap-1 ml-auto"
            >
              <Plus size={14} />
              Add to Blacklist
            </Button>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
