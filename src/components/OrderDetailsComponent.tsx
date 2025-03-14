import React, { useEffect } from 'react';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface OrderDetails {
  id: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: string;
  orderNumber: string;
  shippingAddress?: string;
}

interface OrderDetailsComponentProps {
  order: OrderDetails;
}

const OrderDetailsComponent: React.FC<OrderDetailsComponentProps> = ({ order }) => {
  // Add debug logging to check the order data on component mount
  useEffect(() => {
    console.log('Order details received:', order);
    
    // Check for required properties
    if (!order.items) {
      console.error('Order items are missing:', order);
    }
  }, [order]);

  // Add defensive coding to handle potentially missing data
  if (!order) {
    return <div className="p-4 text-red-500">Error: Order data is missing</div>;
  }
  
  // Ensure items exists and is an array
  const items = Array.isArray(order.items) ? order.items : [];
  
  // Use optional chaining and nullish coalescing for safer property access
  const orderNumber = order?.orderNumber || 'Unknown';
  const status = order?.status || 'Unknown';
  const date = order?.date ? new Date(order.date).toLocaleString() : 'Unknown date'; // Changed to toLocaleString() to include time
  const shippingAddress = order?.shippingAddress || 'Default Address';
  const total = order?.total || 0;

  const calculateTotal = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    
    return items.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const quantity = item.quantity || 1;
      return sum + (price * quantity);
    }, 0);
  };

  return (
    <div className="bg-white p-6 rounded-lg">
      <div className="mb-4 pb-4 border-b">
        <div className="flex justify-between mb-2">
          <h3 className="text-lg font-bold">Order #{orderNumber}</h3>
          <span className={`px-2 py-1 rounded-full text-xs ${
            status === 'completed' ? 'bg-green-100 text-green-800' : 
            status === 'processing' ? 'bg-blue-100 text-blue-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {status}
          </span>
        </div>
        <p className="text-sm text-gray-500">Placed on {date}</p>
        <p className="text-sm text-gray-500">Shipping to: {shippingAddress}</p>
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Items</h4>
        {items.length === 0 ? (
          <p className="text-gray-500">No items in this order</p>
        ) : (
          <div className="space-y-3">
            {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between mb-2">
                <span>{item.name} (x{item.quantity || 1})</span>
                <span>{typeof item.price === 'number' 
                  ? item.price.toFixed(2) 
                  : Number(parseFloat(item.price) || 0).toFixed(2)} NOK</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between mb-2">
          <span>Subtotal:</span>
          <span>{calculateTotal(order.items).toFixed(2)} NOK</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Shipping:</span>
          <span>Free</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total:</span>
          <span>{calculateTotal(order.items).toFixed(2)} NOK</span>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsComponent;
