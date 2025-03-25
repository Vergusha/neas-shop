import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

// Определяем типы для корзины
interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  category?: string;
  collection?: string;
}

const CartPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!user) {
      navigate('/login');
      return;
    }

    // Получаем корзину из localStorage по userId
    const cartKey = `cart_${user.uid}`;
    const storedCart = localStorage.getItem(cartKey);
    
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        setCartItems(parsedCart);
      } catch (error) {
        console.error('Error parsing cart:', error);
        // В случае ошибки создаем пустую корзину
        localStorage.setItem(cartKey, JSON.stringify([]));
      }
    }
    setIsLoading(false);
  }, [user, navigate]);

  const updateCartItem = (id: string, quantity: number) => {
    if (!user) return;

    const updatedCart = cartItems.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
    );
    
    setCartItems(updatedCart);
    
    // Сохраняем обновленную корзину в localStorage
    const cartKey = `cart_${user.uid}`;
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    
    // Уведомляем об обновлении корзины
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const removeItem = (id: string) => {
    if (!user) return;

    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    
    // Сохраняем обновленную корзину в localStorage
    const cartKey = `cart_${user.uid}`;
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    
    // Уведомляем об обновлении корзины
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity, 
    0
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
      
      {cartItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-4">Your cart is empty</p>
          <Link to="/" className="btn btn-primary">Continue Shopping</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {cartItems.map(item => (
              <div key={item.id} className="card bg-white mb-4 p-4 shadow-md flex flex-col sm:flex-row gap-4">
                <div className="flex-shrink-0">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold">
                    <Link to={`/product/${item.id}`}>{item.name}</Link>
                  </h3>
                  <p className="text-gray-500">{item.price} NOK</p>
                  <div className="flex items-center mt-2">
                    <button 
                      onClick={() => updateCartItem(item.id, item.quantity - 1)}
                      className="btn btn-xs"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="mx-2">{item.quantity}</span>
                    <button 
                      onClick={() => updateCartItem(item.id, item.quantity + 1)}
                      className="btn btn-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center">
                  <span className="font-bold mr-4">{(item.price * item.quantity).toFixed(2)} NOK</span>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="btn btn-xs btn-error"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="card bg-white p-4 shadow-md">
              <h3 className="font-bold mb-4">Order Summary</h3>
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>{totalPrice.toFixed(2)} NOK</span>
              </div>
              <div className="flex justify-between mb-4">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="border-t pt-2 mb-4">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{totalPrice.toFixed(2)} NOK</span>
                </div>
              </div>
              <button className="btn btn-primary w-full">Proceed to Checkout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
