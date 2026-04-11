export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'confirmed' | 'returned';

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
  returnFee: number; // Return delivery cost (default 15 DH for Ozone)
  status: OrderStatus;
  campaignSource: string; // Campaign Name or 'WhatsApp Organic'
  campaignId?: string; // The Firestore document ID of the active campaign
  adCopyId?: string; // The ID of the specific ad creative
  adCopyName?: string; // The name of the specific ad creative
  created_at: string;
  updated_at: string;
  fbclid?: string;
  eventId?: string;
}
