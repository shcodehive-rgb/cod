import { useState } from 'react';
import { Order } from '@/types/order';

const initialOrders: Order[] = [
  {
    id: '1',
    customerName: 'Ahmed Mohamed',
    phone: '+212612345678',
    city: 'Casablanca',
    product: 'Wireless Headphones',
    sellingPrice: 299,
    productCost: 150,
    packagingCost: 5,
    shippingFee: 20,
    returnFee: 15,
    status: 'pending',
    campaignSource: '1',
  },
  {
    id: '2',
    customerName: 'Fatima Ali',
    phone: '+212698765432',
    city: 'Agadir',
    product: 'Phone Case',
    sellingPrice: 49,
    productCost: 25,
    packagingCost: 5,
    shippingFee: 35,
    returnFee: 15,
    status: 'delivered',
    campaignSource: '2',
  },
];

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

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
    };
    setOrders([...orders, newOrder]);
  };

  const updateOrder = (updatedOrder: Order) => {
    setOrders(orders.map(order => order.id === updatedOrder.id ? updatedOrder : order));
  };

  return { orders, addOrder, updateOrder };
}
