'use client';

import { Campaign } from '@/types/campaign';
import { Order } from '@/types/order';

interface SummaryMetricsProps {
  campaigns: Campaign[];
  orders: Order[];
}

export function SummaryMetrics({ campaigns, orders }: SummaryMetricsProps) {
  // Calculate total planned budget
  const totalPlannedBudget = campaigns.reduce((sum, c) => sum + c.plannedBudget, 0);

  // Calculate total actual spent
  const totalActualSpent = campaigns.reduce((sum, c) => sum + c.actualSpent, 0);

  // Calculate precise net profit per delivered order
  const deliveredOrdersProfit = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const orderNetProfit = o.sellingPrice - o.productCost - o.packagingCost - o.shippingFee;
      return sum + orderNetProfit;
    }, 0);

  // Global Net Profit = Sum of all delivered order profits - Total campaign spend
  const globalNetProfit = deliveredOrdersProfit - totalActualSpent;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Total Planned Budget */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
        <p className="text-slate-400 text-sm font-medium mb-2">Total Planned Budget</p>
        <p className="text-3xl font-bold text-white">
          {totalPlannedBudget.toFixed(0)} <span className="text-base text-slate-400">DH</span>
        </p>
      </div>

      {/* Total Actual Spent */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
        <p className="text-slate-400 text-sm font-medium mb-2">Total Actual Spent</p>
        <p className="text-3xl font-bold text-white">
          {totalActualSpent.toFixed(0)} <span className="text-base text-slate-400">DH</span>
        </p>
      </div>

      {/* Delivered Orders Profit */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
        <p className="text-slate-400 text-sm font-medium mb-2">Delivered Orders Net Profit</p>
        <p className={`text-3xl font-bold ${deliveredOrdersProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {deliveredOrdersProfit >= 0 ? '+' : ''}{deliveredOrdersProfit.toFixed(0)} <span className="text-base">DH</span>
        </p>
      </div>

      {/* Global Net Profit */}
      <div className={`bg-gradient-to-br border rounded-lg p-6 ${
        globalNetProfit >= 0
          ? 'from-green-900 to-slate-900 border-green-700'
          : 'from-red-900 to-slate-900 border-red-700'
      }`}>
        <p className="text-slate-400 text-sm font-medium mb-2">Global Net Profit</p>
        <p className={`text-3xl font-bold ${globalNetProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {globalNetProfit >= 0 ? '+' : ''}{globalNetProfit.toFixed(0)} <span className="text-base">DH</span>
        </p>
      </div>
    </div>
  );
}
