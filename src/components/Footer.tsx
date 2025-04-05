import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#003D2D] text-white py-6"> {/* Возвращен оригинальный цвет bg-[#003D2D] text-white */}
      <div className="container mx-auto grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Company Info */}
        <div>
          <h3 className="font-bold text-lg mb-2">NEAS AS</h3>
          <ul className="text-sm space-y-1">
            <li>Industriveien 1</li>
            <li>6517 Kristiansund</li>
            <li>Org.nr 960684737</li>
            <li>P.O Box 2260 Løkkemyra</li>
            <li>6503 Kristiansund N</li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="font-bold text-lg mb-2">Contact Us</h3>
          <ul className="text-sm space-y-1">
            <li>Phone: 71 56 55 25</li>
            <li>Opening Hours</li>
          </ul>
        </div>

        {/* Social Links */}
        <div>
          <h3 className="font-bold text-lg mb-2">Follow Us</h3>
          <ul className="text-sm space-y-1">
            <li>
              <a href="https://www.facebook.com/neas.i.nabolaget/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                Facebook
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/neas_i_nabolaget/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                Instagram
              </a>
            </li>
            <li>
              <a href="https://www.linkedin.com/company/neas-as/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                LinkedIn
              </a>
            </li>
            <li>
              <a href="https://www.youtube.com/user/neaskanalen" target="_blank" rel="noopener noreferrer" className="hover:underline">
                YouTube
              </a>
            </li>
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-bold text-lg mb-2">Quick Links</h3>
          <ul className="text-sm space-y-1">
            <li>About Us</li>
            <li>Help</li>
            <li>Service Status</li>
            <li>Work With Us</li>
            <li>Privacy and Cookies</li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto mt-6 text-center border-t border-gray-700 pt-4"> {/* Возвращен border-gray-700 */}
        <img 
          src="/logo.svg" 
          alt="NEAS Logo" 
          className="h-6 mx-auto mb-2 sm:h-8" 
        />
        <p className="text-xs text-gray-400 sm:text-sm">We are part of the NEAS GROUP</p> {/* Возвращен text-gray-400 */}
      </div>
    </footer>
  );
};

export default Footer;