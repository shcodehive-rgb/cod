'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderStatus } from '@/types/order';

interface StatusSelectProps {
  value: OrderStatus;
  onSelect: (status: OrderStatus) => void;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-900 text-yellow-200 hover:bg-yellow-800',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-900 text-green-200 hover:bg-green-800',
  },
  returned: {
    label: 'Returned',
    className: 'bg-red-900 text-red-200 hover:bg-red-800',
  },
};

export function StatusSelect({ value, onSelect }: StatusSelectProps) {
  return (
    <Select value={value} onValueChange={(val) => onSelect(val as OrderStatus)}>
      <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-slate-200 h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-slate-800">
        <SelectItem value="pending" className="text-slate-200 focus:bg-slate-800">
          <Badge variant="outline" className={statusConfig.pending.className}>
            {statusConfig.pending.label}
          </Badge>
        </SelectItem>
        <SelectItem value="delivered" className="text-slate-200 focus:bg-slate-800">
          <Badge variant="outline" className={statusConfig.delivered.className}>
            {statusConfig.delivered.label}
          </Badge>
        </SelectItem>
        <SelectItem value="returned" className="text-slate-200 focus:bg-slate-800">
          <Badge variant="outline" className={statusConfig.returned.className}>
            {statusConfig.returned.label}
          </Badge>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
