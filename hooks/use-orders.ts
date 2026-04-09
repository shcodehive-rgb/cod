import { useState } from 'react';
import { Order } from '@/types/order';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = () => {
    const newOrder: Order = {
      id: Date.now().toString(),
      customerName: '',
      phone: '',
      city: '',
      product: '',
      sellingPrice: 0,
      productCost: 0,
      packagingCost: 5,
      shippingFee: 0,
      returnFee: 15,
      status: 'pending',
      campaignSource: 'Organic',
      created_at: '',
      updated_at: '',
    };
    setOrders([...orders, newOrder]);
  };

  const updateOrder = (updatedOrder: Order) => {
    setOrders(orders.map(order => order.id === updatedOrder.id ? updatedOrder : order));
  };

  return { orders, addOrder, updateOrder };
}
