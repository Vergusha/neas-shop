import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#003D2D] text-white py-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-bold">NEAS AS</h3>
          <p>Industriveien 1</p>
          <p>6517 Kristiansund</p>
          <p>Org.nr 960684737</p>
          <p>Postboks 2260 Løkkemyra, 6503 Kristiansund N</p>
        </div>
        <div>
          <h3 className="font-bold">Kontakt oss</h3>
          <p>71 56 55 25</p>
          <p>Åpningstider</p>
        </div>
        <div>
          <h3 className="font-bold">Følg oss</h3>
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
          <h3 className="font-bold">Om oss</h3>
          <p>Kontaktsenter</p>
          <p>Om oss</p>
          <p>Hjelp</p>
          <p>Driftsmeldinger</p>
          <p>Jobb hos oss</p>
          <p>Ansatte</p>
          <p>Sponsorat</p>
          <p>NEAS-BLOGGEN</p>
          <p>Grossist</p>
          <p>Personvern og cookies</p>
        </div>
      </div>
      <div className="container mx-auto mt-8 text-center">
        <img src="/assets/logo.svg" alt="NEAS Logo" className="mx-auto h-8" />
        <p className="mt-4">Vi er en del av NEAS GRUPPEN</p>
      </div>
    </footer>
  );
};

export default Footer;