export type OrderStatus = 'pending' | 'delivered' | 'returned';

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  product: string;
  sellingPrice: number;
  productCost: number; // Wholesale price
  packagingCost: number; // Box/tape cost (default 5 DH)
  shippingFee: number; // Delivery company cost
  status: OrderStatus;
  campaignSource: string; // 'Organic' or campaign ID
}
