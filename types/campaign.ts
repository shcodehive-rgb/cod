export interface Campaign {
  id: string;
  name: string;
  isActive: boolean;
  plannedBudget: number;
  actualSpent: number;
  ordersGenerated: number;
}
