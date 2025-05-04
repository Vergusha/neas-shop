import React, { useRef, useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type CartItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  [key: string]: any;
};

type CartButtonProps = {
  user: any;
  cartItemCount: number;
  currentTheme: 'light' | 'dark' | 'synthwave';
};

const CartButton: React.FC<CartButtonProps> = ({ user, cartItemCount, currentTheme }) => {
  const [cartOpen, setCartOpen] = useState(false);
  const navigate = useNavigate();
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const cartDropdownRef = useRef<HTMLDivElement>(null);

  // Add event listener to close cart dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cartOpen && 
        cartButtonRef.current && 
        cartDropdownRef.current && 
        !cartButtonRef.current.contains(event.target as Node) && 
        !cartDropdownRef.current.contains(event.target as Node)
      ) {
        setCartOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cartOpen]);

  const toggleCartPreview = () => {
    setCartOpen(!cartOpen);
  };

  const handleCartClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/cart');
  };

  // Function to get cart items for preview
  const getCartItems = (): CartItem[] => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    return cart.slice(0, 3); // Get first 3 items for preview
  };

  return (
    <div className="relative">
      <button 
        ref={cartButtonRef}
        onClick={toggleCartPreview} 
        className="relative flex items-center justify-center w-10 h-10 transition-all duration-300 ease-in-out rounded-full hover:bg-white/10"
        title="Cart"
      >
        <ShoppingCart size={24} className="text-white" />
        {user && cartItemCount > 0 && (
          <div className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full -top-1 -right-1">
            {cartItemCount}
          </div>
        )}
      </button>
      
      {/* Cart preview dropdown */}
      {user && cartOpen && cartItemCount > 0 && (
        <div ref={cartDropdownRef} className="absolute right-0 z-20 mt-2 bg-white rounded-md shadow-xl cart-dropdown w-80">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Your Cart ({cartItemCount} items)</h3>
          </div>
          <div className="p-2 overflow-y-auto max-h-60">
            {getCartItems().map((item: CartItem, index: number) => (
              <div key={index} className="flex items-center p-2 border-b hover:bg-gray-100">
                <img src={item.image} alt={item.name} className="object-contain w-12 h-12" />
                <div className="flex-1 ml-2">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.quantity} × {item.price} NOK</p>
                </div>
              </div>
            ))}
            
            {cartItemCount > 3 && (
              <p className="mt-2 text-xs text-center text-gray-500">
                and {cartItemCount - 3} more items...
              </p>
            )}
          </div>
          <div className="p-3 bg-gray-50">
            <button 
              onClick={() => {
                setCartOpen(false);
                handleCartClick();
              }}
              className="w-full btn btn-neas-green btn-sm"
            >
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartButton;