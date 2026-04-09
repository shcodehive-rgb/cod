import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/app/actions';

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();
    
    // Add default values (timestamps handled by createOrder action)
    const processedOrderData = {
      ...orderData,
      status: orderData.status || 'pending',
      packagingCost: orderData.packagingCost || 5,
      returnFee: orderData.returnFee || 15,
      campaignSource: orderData.campaignSource || 'Organic',
    };

    const result = await createOrder(processedOrderData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        message: 'Order created successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { fetchOrders } = await import('@/app/actions');
    const orders = await fetchOrders();
    
    return NextResponse.json({ 
      success: true, 
      data: orders 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch orders' 
    }, { status: 500 });
  }
}
