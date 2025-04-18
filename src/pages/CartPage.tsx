import React, { useEffect, useState } from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, database } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';

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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [formErrors, setFormErrors] = useState<{name?: string, phone?: string}>({});
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

            // Also try 'gaming' collection
            const gamingDoc = await getDoc(doc(db, 'gaming', item.id));
            if (gamingDoc.exists()) {
              const gamingData = gamingDoc.data();
              return {
                ...item,
                name: gamingData.name,
                price: gamingData.price,
                image: gamingData.image
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
    
    // Pre-fill customer info if available
    const currentUser = auth.currentUser;
    if (currentUser) {
      setCustomerName(currentUser.displayName || '');
      // Try to get phone from localStorage
      const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (savedProfile.phoneNumber) {
        setCustomerPhone(savedProfile.phoneNumber);
      }
    } else {
      // Try to get saved info from localStorage
      const savedName = localStorage.getItem('checkoutName') || '';
      const savedPhone = localStorage.getItem('checkoutPhone') || '';
      setCustomerName(savedName);
      setCustomerPhone(savedPhone);
    }
  }, [auth]);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const updatedCart = cartItems.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (id: string) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const validateForm = (): boolean => {
    const errors: {name?: string, phone?: string} = {};
    let isValid = true;

    if (!customerName.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }

    if (!customerPhone.trim()) {
      errors.phone = 'Phone number is required';
      isValid = false;
    } else if (!/^\+?[0-9\s-()]{8,}$/.test(customerPhone.trim())) {
      errors.phone = 'Please enter a valid phone number';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    // Validate customer information
    if (!validateForm()) {
      return;
    }
    
    try {
      const total = calculateTotal();
      const currentUser = auth.currentUser;
      
      // Get user's custom ID if logged in
      let customUserId = 'guest';
      if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          customUserId = snapshot.val().customUserId;
        }
      }
      
      const orderDate = new Date();
      const orderNumber = `ORD-${Math.floor(Math.random() * 10000)}-${orderDate.getFullYear()}`;
      
      // Save customer info to localStorage for future checkouts
      localStorage.setItem('checkoutName', customerName);
      localStorage.setItem('checkoutPhone', customerPhone);
      
      // Ensure items have numeric prices
      const normalizedItems = cartItems.map(item => ({
        ...item,
        price: Number(item.price),
        quantity: Number(item.quantity)
      }));
      
      // Create order object with customer information
      const orderData = {
        id: Date.now().toString(),
        items: normalizedItems,
        total: Number(total),
        date: orderDate.toISOString(),
        status: 'completed',
        orderNumber: orderNumber,
        shippingAddress: 'Default Address',
        userId: currentUser ? currentUser.uid : 'anonymous',
        userEmail: currentUser ? currentUser.email : 'guest',
        customUserId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim()
      };
      
      // Save to Firebase if user is logged in
      if (currentUser) {
        try {
          // Use a more structured path for orders that includes the timestamp for better sorting
          const ordersRef = ref(database, `orders/${currentUser.uid}/${orderData.id}`);
          await set(ordersRef, orderData);
          
          // Also save to Firestore for better querying capabilities
          const orderDocRef = doc(db, 'orders', orderNumber);
          await setDoc(orderDocRef, {
            ...orderData,
            createdAt: orderDate.toISOString()
          });
          
          console.log('Order saved successfully to Firebase');
        } catch (firebaseError) {
          console.error('Error saving order to Firebase:', firebaseError);
          // Continue with local storage as fallback
          saveOrderToLocalStorage(orderData);
        }
      } else {
        // For non-logged-in users, save to localStorage
        saveOrderToLocalStorage(orderData);
      }
      
      // Set checkout success state before clearing cart
      setCheckoutSuccess(true);
      
      // Clear the cart immediately after successful order
      setCartItems([]);
      localStorage.removeItem('cart');
      
      // Dispatch custom event to update cart count in header
      try {
        window.dispatchEvent(new Event('cartUpdated'));
      } catch (eventError) {
        console.error('Error dispatching cartUpdated event:', eventError);
      }
      
      console.log('Cart cleared successfully');
      
      // Navigate after a delay
      setTimeout(() => {
        setCheckoutSuccess(false);
        navigate('/profile', { state: { newOrder: true } });
      }, 3000);
      
    } catch (error) {
      console.error('Error processing order:', error);
      alert('There was an error processing your order. Please try again.');
    }
  };

  // Helper function to save order to localStorage
  const saveOrderToLocalStorage = (orderData: any) => {
    try {
      const anonymousOrders = JSON.parse(localStorage.getItem('anonymousOrders') || '[]');
      const newOrder = {
        ...orderData,
        id: `local-${Date.now()}`,
      };
      anonymousOrders.push(newOrder);
      localStorage.setItem('anonymousOrders', JSON.stringify(anonymousOrders));
      console.log('Order saved successfully to localStorage');
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError);
    }
  };

  const calculateTotal = (): number => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="container py-8 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">Shopping Cart</h1>
      
      {checkoutSuccess && (
        <div className="relative px-4 py-3 mb-4 text-green-700 bg-green-100 border border-green-400 rounded" role="alert">
          <strong className="font-bold">Congratulations on your purchase!</strong>
          <span className="block sm:inline"> Your order has been placed successfully.</span>
        </div>
      )}
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        {/* Left column with cart items and customer info */}
        <div className="md:w-1/2 lg:w-2/3">
          {/* Убираем проверку !checkoutSuccess, чтобы всегда показывать пустую корзину */}
          {cartItems.length === 0 ? (
            <div className="p-8 mb-6 text-center bg-white rounded-lg shadow-md">
              <h2 className="mb-4 text-xl font-semibold">Your cart is empty</h2>
              <p className="mb-4">Add some products to your cart to continue shopping.</p>
              <button 
                className="w-full btn btn-neas-green btn-sm"
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="mb-6 overflow-hidden bg-white rounded-lg shadow-md">
              {/* Mobile view - Card layout for smaller screens */}
              <div className="block sm:hidden">
                {cartItems.map((item) => (
                  <div key={item.id} className="relative p-4 border-b border-gray-200 last:border-b-0">
                    {/* Position delete button at the top right corner */}
                    <button 
                      className="absolute text-red-600 top-2 right-2 hover:text-red-900"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-16 h-16">
                        <img className="object-contain w-16 h-16" src={item.image} alt={item.name} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium">{item.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{Number(item.price).toFixed(2)} NOK</p>
                        <div className="flex items-center mt-2">
                          <button 
                            className="p-1 rounded-full hover:bg-gray-200"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 mx-2 text-center">{item.quantity}</span>
                          <button 
                            className="p-1 rounded-full hover:bg-gray-200"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{Number(item.price * item.quantity).toFixed(2)} NOK</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop view - Table layout for larger screens - more compact */}
              <table className="hidden min-w-full divide-y divide-gray-200 sm:table">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Price
                    </th>
                    <th scope="col" className="px-4 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Qty
                    </th>
                    <th scope="col" className="px-4 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Total
                    </th>
                    <th scope="col" className="w-10 px-4 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-12 h-12">
                            <img className="object-contain w-12 h-12" src={item.image} alt={item.name} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{Number(item.price).toFixed(2)} NOK</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <button 
                            className="p-1 text-xs bg-gray-100 rounded-full hover:bg-gray-200"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-sm text-center">{item.quantity}</span>
                          <button 
                            className="p-1 text-xs bg-gray-100 rounded-full hover:bg-gray-200"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{Number(item.price * item.quantity).toFixed(2)} NOK</div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button 
                          className="text-red-600 transition-transform hover:text-red-900 hover:scale-110"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="flex justify-center mb-6">
              <button 
                className="btn btn-outline btn-error btn-sm"
                onClick={clearCart}
              >
                Clear Cart
              </button>
            </div>
          )}
          
          {/* Customer information form - more compact version */}
          <div className="p-4 mb-6 bg-white rounded-lg shadow-md">
            <h2 className="mb-3 text-lg font-bold">Customer Information</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="customerName" className="block mb-1 text-sm text-gray-700">Full Name *</label>
                <input
                  type="text"
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full input input-sm input-bordered ${formErrors.name ? 'input-error' : ''}`}
                  required
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
              </div>
              <div>
                <label htmlFor="customerPhone" className="block mb-1 text-sm text-gray-700">Phone Number *</label>
                <input
                  type="tel"
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={`w-full input input-sm input-bordered ${formErrors.phone ? 'input-error' : ''}`}
                  placeholder="+47 123 45 678"
                  required
                />
                {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column with order summary - always displayed */}
        <div className="p-6 bg-white rounded-lg shadow-md md:w-1/2 lg:w-1/3 h-fit">
          <h2 className="mb-4 text-lg font-bold">Order Summary</h2>
          <div className="flex justify-between mb-2">
            <span>Subtotal:</span>
            <span>{Number(calculateTotal()).toFixed(2)} NOK</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Shipping:</span>
            <span>Free</span>
          </div>
          <div className="my-4 border-t border-gray-200"></div>
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{Number(calculateTotal()).toFixed(2)} NOK</span>
          </div>
          
          <button 
            className="w-full mt-4 btn btn-neas-green"
            onClick={handleCheckout}
            disabled={cartItems.length === 0}
          >
            Checkout
          </button>
          
          {cartItems.length === 0 && (
            <p className="mt-2 text-sm text-center text-red-500">
              Please add items to your cart before checking out
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;
