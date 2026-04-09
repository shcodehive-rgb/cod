'use client';

// Fixed: campaigns prop properly destructured
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OrderRow } from './order-row';
import { Order } from '@/types/order';
import { Campaign } from '@/types/campaign';
import { BlacklistEntry } from '@/types/blacklist';

interface OrdersTableProps {
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  campaigns?: Campaign[];
  blacklist?: BlacklistEntry[];
  isPhoneBlacklisted?: (phone: string) => boolean;
  onAddToBlacklist?: (phone: string, reason: string) => void;
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-900 text-yellow-200 hover:bg-yellow-800' },
  shipped: { label: 'Shipped', className: 'bg-blue-900 text-blue-200 hover:bg-blue-800' },
  delivered: { label: 'Delivered', className: 'bg-green-900 text-green-200 hover:bg-green-800' },
  returned: { label: 'Returned', className: 'bg-red-900 text-red-200 hover:bg-red-800' },
};

export function OrdersTable({ 
  orders, 
  onUpdateOrder, 
  onDeleteOrder,
  campaigns,
  blacklist = [], 
  isPhoneBlacklisted = () => false,
  onAddToBlacklist = () => {},
}: OrdersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-800 hover:bg-slate-800/50">
          <TableHead className="text-slate-300 font-semibold min-w-[200px]">Customer Name</TableHead>
          <TableHead className="text-slate-300 font-semibold min-w-[160px]">Date & Time</TableHead>
          <TableHead className="text-slate-300 font-semibold min-w-[180px]">Phone</TableHead>
          <TableHead className="text-slate-300 font-semibold min-w-[150px]">City</TableHead>
          <TableHead className="text-slate-300 font-semibold min-w-[180px]">Product</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right min-w-[120px]">Selling Price (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right min-w-[120px]">Product Cost (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right min-w-[100px]">Packaging (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right min-w-[100px]">Shipping Fee (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right min-w-[100px]">Return Fee (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold min-w-[150px]">Ad Campaign (Source)</TableHead>
          <TableHead className="text-slate-300 font-semibold min-w-[100px]">Status</TableHead>
          <TableHead className="text-slate-300 font-semibold text-right min-w-[120px]">Net Profit (DH)</TableHead>
          <TableHead className="text-slate-300 font-semibold">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={12} className="text-center py-8 text-slate-400">
              No orders yet. Add your first order to get started.
            </TableCell>
          </TableRow>
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onUpdate={onUpdateOrder}
              onDelete={onDeleteOrder}
              statusConfig={statusConfig}
              campaigns={campaigns || []}
              isBlacklisted={isPhoneBlacklisted(order.phone)}
              onAddToBlacklist={onAddToBlacklist}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
