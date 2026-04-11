'use client';

// Fixed: campaigns prop properly destructured and passed to CampaignSelect
import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Trash2, ExternalLink } from 'lucide-react';
import { CityCombobox } from './city-combobox';
import { StatusSelect } from './status-select';
import { CampaignSelect } from './campaign-select';
import { AdCopySelect } from './ad-copy-select';
import { Order, OrderStatus } from '@/types/order';
import { Campaign } from '@/types/campaign';
import { OZONE_CITIES } from '@/data/cities';
import { format } from 'date-fns';
import { SuppressHydration } from '@/components/ui/suppress-hydration';

interface OrderRowProps {
  order: Order;
  onUpdate: (order: Order) => void;
  onDelete: (id: string) => void;
  statusConfig: Record<string, { label: string; className: string }>;
  campaigns: Campaign[];
  isBlacklisted?: boolean;
  onAddToBlacklist?: (phone: string, reason: string) => void;
}

export function OrderRow({ 
  order, 
  onUpdate, 
  onDelete,
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
      // Include customer name in the reason for better tracking
      const fullReason = `${order.customerName ? `${order.customerName} - ` : ''}${blacklistReason}`;
      onAddToBlacklist(order.phone, fullReason);
      setBlacklistReason('');
      setShowBlacklistDialog(false);
    }
  };

  // Calculate net profit for this order with dynamic e-commerce logic
  const calculateNetProfit = (status: OrderStatus, sellingPrice: number, productCost: number, packagingCost: number, shippingFee: number, returnFee: number) => {
    switch (status) {
      case 'delivered':
        // Net Profit = Selling Price - Product Cost - Packaging - Shipping Fee
        return sellingPrice - productCost - packagingCost - shippingFee;
      
      case 'returned':
        // Net Profit = 0 - Packaging - Shipping Fee - Return Fee (item returned to inventory)
        return 0 - packagingCost - shippingFee - returnFee;
      
      case 'shipped':
        // Expected Profit for shipped orders
        return sellingPrice - productCost - packagingCost - shippingFee;
      
      case 'pending':
        // Expected Profit for pending orders (can be shown as 0 or expected)
        return 0; // Or: sellingPrice - productCost - packagingCost - shippingFee
      
      default:
        return 0;
    }
  };

  const netProfit = calculateNetProfit(
    order.status,
    order.sellingPrice,
    order.productCost,
    order.packagingCost,
    order.shippingFee,
    order.returnFee
  );

  return (
    <>
      <TableRow className={`border-slate-800 hover:bg-slate-800/30 ${
        isBlacklisted ? 'bg-red-950/30 border-l-4 border-l-red-700' : ''
      }`}>
        <TableCell className="text-slate-200 min-w-[200px]">
          <SuppressHydration>
            <Input
              value={order.customerName}
              onChange={(e) => handleFieldChange('customerName', e.target.value)}
              className="bg-slate-950 border-slate-700 text-white text-sm h-8 w-full"
              placeholder="Customer name"
            />
          </SuppressHydration>
        </TableCell>
        <TableCell className="text-slate-400 text-xs min-w-[160px]">
          {order.created_at ? 
            format(new Date(order.created_at), 'dd/MM/yyyy HH:mm') : 
            order.id.startsWith('temp-') ? 
              <span className="text-blue-400">En cours...</span> : 
              <span className="text-amber-400">No Timestamp</span>
          }
        </TableCell>
        <TableCell className="text-slate-200 min-w-[180px]">
          <div className="flex items-center gap-2">
            {isBlacklisted && <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />}
            <div className="relative group flex-1">
              <SuppressHydration>
                <Input
                  value={order.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-sm h-8 w-full pr-8"
                  placeholder="Phone"
                />
              </SuppressHydration>
              {order.phone && (
                <a 
                  href={`https://wa.me/${order.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2 top-1.5 text-emerald-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Chat on WhatsApp"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-slate-200 min-w-[150px]">
          <CityCombobox
            value={order.city}
            onSelect={(city) => handleFieldChange('city', city)}
          />
        </TableCell>
        <TableCell className="text-slate-200 min-w-[180px]">
          <SuppressHydration>
            <Input
              value={order.product}
              onChange={(e) => handleFieldChange('product', e.target.value)}
              className="bg-slate-950 border-slate-700 text-white text-sm h-8 w-full"
              placeholder="Product"
            />
          </SuppressHydration>
        </TableCell>
        <TableCell className="text-right text-slate-200 min-w-[120px]">
          <SuppressHydration>
            <Input
              type="number"
              min="0"
              value={order.sellingPrice}
              onChange={(e) => handleFieldChange('sellingPrice', Number(e.target.value) || 0)}
              className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right w-full"
              placeholder="0"
            />
          </SuppressHydration>
        </TableCell>
        <TableCell className="text-right text-slate-200 min-w-[120px]">
          <SuppressHydration>
            <Input
              type="number"
              min="0"
              value={order.productCost}
              onChange={(e) => handleFieldChange('productCost', Number(e.target.value) || 0)}
              className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right w-full"
              placeholder="0"
            />
          </SuppressHydration>
        </TableCell>
        <TableCell className="text-right text-slate-200 min-w-[100px]">
          <SuppressHydration>
            <Input
              type="number"
              min="0"
              value={order.packagingCost}
              onChange={(e) => handleFieldChange('packagingCost', Number(e.target.value) || 0)}
              className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right w-full"
              placeholder="0"
            />
          </SuppressHydration>
        </TableCell>
        <TableCell className="text-right text-slate-200 min-w-[100px]">
          <SuppressHydration>
            <Input
              type="number"
              min="0"
              value={order.shippingFee}
              onChange={(e) => handleFieldChange('shippingFee', Number(e.target.value) || 0)}
              className="bg-slate-800 border-slate-700 text-slate-300 text-sm h-8 text-right cursor-not-allowed w-full"
              placeholder="Auto-filled"
              disabled
            />
          </SuppressHydration>
        </TableCell>
        <TableCell className="text-right text-slate-200 min-w-[100px]">
          <SuppressHydration>
            <Input
              type="number"
              min="0"
              value={order.returnFee}
              onChange={(e) => handleFieldChange('returnFee', Number(e.target.value) || 0)}
              className="bg-slate-950 border-slate-700 text-white text-sm h-8 text-right w-full"
              placeholder="0"
            />
          </SuppressHydration>
        </TableCell>
        <TableCell className="text-slate-200 min-w-[150px]">
          <CampaignSelect
            value={order.campaignSource}
            onSelect={(source) => handleFieldChange('campaignSource', source)}
            campaigns={campaigns}
          />
        </TableCell>
        <TableCell className="text-slate-200 min-w-[150px]">
          <AdCopySelect
            value={order.adCopyId || ''}
            onSelect={(adCopyId, adCopyName) => {
              handleFieldChange('adCopyId', adCopyId);
              handleFieldChange('adCopyName', adCopyName);
            }}
            campaigns={campaigns}
            selectedCampaignId={order.campaignSource === 'Organic' ? undefined : order.campaignSource}
          />
        </TableCell>
        <TableCell className="text-slate-200 min-w-[100px]">
          <StatusSelect
            value={order.status}
            onSelect={(status) => handleFieldChange('status', status)}
          />
        </TableCell>
        <TableCell className={`text-right font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {netProfit.toFixed(2)} DH
        </TableCell>
        <TableCell className="text-slate-200">
          <Button
            onClick={() => onDelete(order.id)}
            variant="outline"
            size="sm"
            className="border-red-700/30 text-red-400 hover:bg-red-950/30 text-xs gap-1"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </TableCell>
      </TableRow>
      
      {/* Blacklist Dialog Row */}
      {showBlacklistDialog && (
        <TableRow className="bg-red-950/20 border-slate-700">
          <TableCell colSpan={14} className="py-4">
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
      
      {/* Action Menu Row */}
      {!isBlacklisted && !showBlacklistDialog && (
        <TableRow className="bg-slate-900/50 border-slate-800">
          <TableCell colSpan={14} className="py-2">
            <div className="flex justify-end">
              <Button
                onClick={() => setShowBlacklistDialog(true)}
                variant="outline"
                size="sm"
                className="border-red-700/30 text-red-400 hover:bg-red-950/30 text-xs gap-1"
              >
                <Plus size={14} />
                Add to Blacklist
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
