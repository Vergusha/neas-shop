import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getTheme } from '../../utils/themeUtils';

const Footer = () => {
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  useEffect(() => {
    const handleThemeChange = () => setCurrentTheme(getTheme());
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  return (
    <footer
      className={`py-8 mt-auto text-white dark:text-white ${currentTheme === 'dark' ? 'bg-[#7fb356]' : 'bg-[#1a4731]'}`}
    >
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">About Us</h3>
            <p className="text-sm opacity-90">
              Your trusted source for electronics and tech products.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/tv" className="hover:underline">TV & Audio</Link>
              </li>
              <li>
                <Link to="/mobile" className="hover:underline">Mobile</Link>
              </li>
              <li>
                <Link to="/laptops" className="hover:underline">Laptops</Link>
              </li>
              <li>
                <Link to="/gaming" className="hover:underline">Gaming</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/support" className="hover:underline">Contact Us</Link>
              </li>
              <li>
                <Link to="/data" className="hover:underline">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/data" className="hover:underline">Terms of Service</Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Stay Updated</h3>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className={`w-full px-3 py-2 border rounded-lg ${
                  currentTheme === 'dark' 
                    ? 'bg-gray-800 text-gray-200 border-gray-700 placeholder-gray-400' 
                    : 'bg-white text-black border-gray-300'
                }`}
              />
              <button 
                type="submit"
                className="px-4 py-2 text-white transition-colors bg-[#005040] hover:bg-[#004030] dark:bg-[#7fb356] dark:hover:bg-[#6a9b47] rounded-lg"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 mt-8 text-sm text-center border-t border-white/20">
          <p>&copy; {new Date().getFullYear()} NEAS Shop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;