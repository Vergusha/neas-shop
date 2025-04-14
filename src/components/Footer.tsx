import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-8 mt-auto text-white bg-[#003d2d] dark:bg-[#95c672] dark:text-gray-900">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white dark:text-gray-900">About Us</h3>
            <p className="text-sm opacity-90 text-white dark:text-gray-900">
              Your trusted source for electronics and tech products.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white dark:text-gray-900">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/tv" className="text-white dark:text-gray-900 hover:underline">TV & Audio</Link>
              </li>
              <li>
                <Link to="/mobile" className="text-white dark:text-gray-900 hover:underline">Mobile</Link>
              </li>
              <li>
                <Link to="/laptops" className="text-white dark:text-gray-900 hover:underline">Laptops</Link>
              </li>
              <li>
                <Link to="/gaming" className="text-white dark:text-gray-900 hover:underline">Gaming</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white dark:text-gray-900">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/support" className="text-white dark:text-gray-900 hover:underline">Contact Us</Link>
              </li>
              <li>
                <Link to="/data" className="text-white dark:text-gray-900 hover:underline">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/data" className="text-white dark:text-gray-900 hover:underline">Terms of Service</Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white dark:text-gray-900">Stay Updated</h3>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 text-black bg-white border rounded-lg dark:bg-gray-100"
              />
              <button 
                type="submit"
                className="px-4 py-2 text-white transition-colors bg-[#005040] hover:bg-[#004030] dark:bg-[#7fb356] dark:hover:bg-[#6a9b47] dark:text-gray-900 rounded-lg"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 mt-8 text-sm text-center border-t border-white/20">
          <p className="text-white dark:text-gray-900">&copy; {new Date().getFullYear()} NEAS Shop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;