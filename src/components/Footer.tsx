import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#003D2D] text-white py-8">
      <div className="container grid grid-cols-1 gap-8 mx-auto md:grid-cols-4">
        <div>
          <h3 className="font-bold">NEAS AS</h3>
          <p>Industriveien 1</p>
          <p>6517 Kristiansund</p>
          <p>Org.nr 960684737</p>
          <p>P.O Box 2260 Løkkemyra, 6503 Kristiansund N</p>
        </div>
        <div>
          <h3 className="font-bold">Contact Us</h3>
          <p>71 56 55 25</p>
          <p>Opening Hours</p>
        </div>
        <div>
          <h3 className="font-bold">Follow Us</h3>
          <p>
            <a href="https://www.facebook.com/neas.i.nabolaget/" target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          </p>
          <p> 
            <a href="https://www.instagram.com/neas_i_nabolaget/" target="_blank" rel="noopener noreferrer">
            Instagram
            </a>
          </p>
          <p>
          <a href="https://www.linkedin.com/company/neas-as/" target="_blank" rel="noopener noreferrer">
          LinkedIn</a>
          </p>
          <p>
          <a href="https://www.youtube.com/user/neaskanalen" target="_blank" rel="noopener noreferrer">
            YouTube</a>
          </p>
        </div>
        <div>
          <h3 className="font-bold">About Us</h3>
          <p>Contact Center</p>
          <p>About Us</p>
          <p>Help</p>
          <p>Service Status</p>
          <p>Work With Us</p>
          <p>Employees</p>
          <p>Sponsorship</p>
          <p>NEAS BLOG</p>
          <p>Wholesale</p>
          <p>Privacy and Cookies</p>
        </div>
      </div>
      <div className="container mx-auto mt-8 text-center">
        <img 
          src="/logo.svg" 
          alt="NEAS Logo" 
          className="h-8 mx-auto bg-transparent" 
          style={{ filter: 'brightness(1.2)' }} // Добавляем немного яркости для лучшей видимости на тёмном фоне
        />
        <p className="mt-4 text-gray-300">We are part of the NEAS GROUP</p>
      </div>
    </footer>
  );
};

export default Footer;