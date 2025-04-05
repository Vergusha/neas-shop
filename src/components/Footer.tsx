import React from 'react';
import { useEffect, useState } from 'react';
import { getTheme } from '../utils/themeUtils';

const Footer: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  return (
    <footer className={`${
      currentTheme === 'dark' ? 'bg-[#eebbca] text-gray-900' : 'bg-[#003D2D] text-white'
    } py-6`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap">
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <h3 className="text-lg font-bold mb-2">NEAS Shop</h3>
            <p className="mb-4">Your go-to electronics store</p>
            <p className="text-sm">© 2023 NEAS Shop. All rights reserved.</p>
          </div>
          
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <h3 className="text-lg font-bold mb-2">Contact</h3>
            <p className="mb-1">Email: info@neas-shop.com</p>
            <p className="mb-1">Phone: (123) 456-7890</p>
            <p>Address: 123 Main St, Oslo, Norway</p>
          </div>
          
          <div className="w-full md:w-1/3">
            <h3 className="text-lg font-bold mb-2">Links</h3>
            <ul>
              <li className="mb-1"><a href="/about" className="hover:underline">About Us</a></li>
              <li className="mb-1"><a href="/terms" className="hover:underline">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:underline">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;