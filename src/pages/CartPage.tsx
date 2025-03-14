import React, { useEffect, useState } from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, database } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ref, push, set } from 'firebase/database';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const CartPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const fetchCartItems = async () => {
      try {
        const storedCart = JSON.parse(localStorage.getItem('cart') || '[]');
        if (storedCart.length === 0) {
          setCartItems([]);
          setLoading(false);
          return;
        }

        const cartPromises = storedCart.map(async (item: CartItem) => {
          try {
            // Try to fetch from 'products' collection first
            const productDoc = await getDoc(doc(db, 'products', item.id));
            if (productDoc.exists()) {
              const productData = productDoc.data();
              return {
                ...item,
                name: productData.name,
                price: productData.price,
                image: productData.image
              };
            }

            // If not found in 'products', try 'mobile' collection
            const mobileDoc = await getDoc(doc(db, 'mobile', item.id));
            if (mobileDoc.exists()) {
              const mobileData = mobileDoc.data();
              return {
                ...item,
                name: mobileData.name,
                price: mobileData.price,
                image: mobileData.image
              };
            }

            // If product not found in any collection, return as is
            return item;
          } catch (error) {
            console.error(`Error fetching product ${item.id}:`, error);
            return item;
          }
        });

        const resolvedItems = await Promise.all(cartPromises);
        setCartItems(resolvedItems);
      } catch (error) {
        console.error('Error fetching cart items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCartItems();
  }, []);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const updatedCart = cartItems.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const removeItem = (id: string) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    try {
      const total = calculateTotal();
      const currentUser = auth.currentUser;
      const orderDate = new Date();
      const orderNumber = `ORD-${Math.floor(Math.random() * 10000)}-${orderDate.getFullYear()}`;
      
      // Ensure items have numeric prices
      const normalizedItems = cartItems.map(item => ({
        ...item,
        price: Number(item.price),
        quantity: Number(item.quantity)
      }));
      
      // Create order object
      const orderData = {
        items: normalizedItems,
        total: Number(total),
        date: orderDate.toISOString(),
        status: 'completed',
        orderNumber: orderNumber,
        shippingAddress: 'Default Address', // In a real app, get this from a form
        userId: currentUser ? currentUser.uid : 'anonymous',
        userEmail: currentUser ? currentUser.email : 'guest'
      };
      
      // Save to Firebase if user is logged in
      if (currentUser) {
        // Use a more structured path for orders that includes the timestamp for better sorting
        const ordersRef = ref(database, `orders/${currentUser.uid}/${Date.now()}`);
        await set(ordersRef, orderData);
        
        // Also save to Firestore for better querying capabilities
        const orderDocRef = doc(db, 'orders', orderNumber);
        await setDoc(orderDocRef, {
          ...orderData,
          createdAt: orderDate.toISOString()
        });
        
        console.log('Order saved successfully');
      } else {
        // For non-logged-in users, save to localStorage
        const anonymousOrders = JSON.parse(localStorage.getItem('anonymousOrders') || '[]');
        const newOrder = {
          ...orderData,
          id: `local-${Date.now()}`,
        };
        anonymousOrders.push(newOrder);
        localStorage.setItem('anonymousOrders', JSON.stringify(anonymousOrders));
      }
      
      setCheckoutSuccess(true);
      clearCart();
      
      setTimeout(() => {
        setCheckoutSuccess(false);
        navigate('/profile', { state: { newOrder: true } }); // Pass state to trigger order refresh
      }, 3000);
      
    } catch (error) {
      console.error('Error processing order:', error);
      alert('There was an error processing your order. Please try again.');
    }
  };

  const calculateTotal = (): number => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (loading) {
    return <div className="flex justify-center items-center py-8"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Shopping Cart</h1>
      
      {checkoutSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Congratulations on your purchase!</strong>
          <span className="block sm:inline"> Your order has been placed successfully.</span>
        </div>
      )}

      {cartItems.length === 0 && !checkoutSuccess ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">Your cart is empty</h2>
          <p className="mb-4">Add some products to your cart to continue shopping.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/')}
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-16">
                          <img className="h-16 w-16 object-contain" src={item.image} alt={item.name} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{Number(item.price).toFixed(2)} NOK</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button 
                          className="p-1 rounded-full hover:bg-gray-200"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="mx-2 w-8 text-center">{item.quantity}</span>
                        <button 
                          className="p-1 rounded-full hover:bg-gray-200"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{Number(item.price * item.quantity).toFixed(2)} NOK</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="md:w-1/2 lg:w-2/3">
              <button 
                className="btn btn-outline btn-error"
                onClick={clearCart}
              >
                Clear Cart
              </button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md md:w-1/2 lg:w-1/3">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>{Number(calculateTotal()).toFixed(2)} NOK</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="border-t border-gray-200 my-4"></div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{Number(calculateTotal()).toFixed(2)} NOK</span>
              </div>
              <button 
                className="btn btn-primary w-full mt-4"
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
              >
                Checkout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
