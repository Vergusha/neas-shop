import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import CategoryList from './components/CategoryList';
import Footer from './components/Footer';
import MobilePage from './pages/MobilePage';
import ProductPage from './pages/ProductPage';
import DataPage from './pages/DataPage';
import GamingPage from './pages/GamingPage';
import TvPage from './pages/TvPage';
import SmartHomePage from './pages/SmartHomePage';
import SupportPage from './pages/SupportPage';
import SearchResultsPage from './pages/SearchResultsPage';
import Register from './pages/Register';
import Login from './pages/Login';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import Home from './pages/Home';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products/mobil" element={<MobilePage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/products/data-og-tilbehor" element={<DataPage />} />
            <Route path="/products/gaming" element={<GamingPage />} />
            <Route path="/products/tv-og-lyd" element={<TvPage />} />
            <Route path="/products/smarte-hjem" element={<SmartHomePage />} />
            <Route path="/products/power-support" element={<SupportPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;