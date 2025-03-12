import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import CategoryList from './components/CategoryList';
import Footer from './components/Footer';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage'; // Импортируем файл ProductPage из папки pages
import DataPage from './pages/DataPage';
import GamingPage from './pages/GamingPage';
import TvPage from './pages/TvPage';
import SmartHomePage from './pages/SmartHomePage';
import SupportPage from './pages/SupportPage';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<CategoryList />} />
            <Route path="/products/:category" element={<ProductsPage />} />
            <Route path="/product/:id" element={<ProductPage />} /> {/* Новый маршрут */}
            <Route path="/products/data-og-tilbehor" element={<DataPage />} />
            <Route path="/products/gaming" element={<GamingPage />} />
            <Route path="/products/tv-og-lyd" element={<TvPage />} />
            <Route path="/products/smarte-hjem" element={<SmartHomePage />} />
            <Route path="/products/power-support" element={<SupportPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;