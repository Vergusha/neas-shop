import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
// Add this import for the router's future flags
import { UNSAFE_ENHANCE_TRANSITION_STUB_SOURCE } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import MobilePage from './pages/MobilePage';
import ProductPage from './pages/ProductPage';
import DataPage from './pages/DataPage';
import GamingPage from './pages/GamingPage';
import TvPage from './pages/TvPage';
import SupportPage from './pages/SupportPage';
import SearchResultsPage from './pages/SearchResultsPage';
import Register from './pages/Register'; // Обновляем путь импорта с components на pages
import Login from './pages/Login';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import CartPage from './pages/CartPage';
import Home from './pages/Home';
import Breadcrumbs from './components/Breadcrumbs';
import AdminPanel from './components/AdminPanel'; // Fix import path
import { isAdmin } from './utils/constants';
import { getAuth } from 'firebase/auth';
import { useEffect } from 'react'; // Add this import
import { AuthProvider } from './utils/AuthProvider'; // Add this import
import LoginRedirect from './components/LoginRedirect';
import KeywordDebugger from './utils/KeywordDebugger'; // Добавляем импорт компонента KeywordDebugger
import LaptopsPage from './pages/LaptopsPage'; // Add this import
import './styles/ProductCardStyles.css';
import './styles/HeaderStyles.css';
import './styles/CartStyles.css'; // Add the import for cart styles
import { initializeTheme } from './utils/themeUtils';

// Оптимизированные настройки для маршрутизации
const router_future = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user || !isAdmin(user.email)) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

const App = () => {
  useEffect(() => {
    // Initialize theme on app start
    initializeTheme();
    
    // Run the migrations once to ensure database structure is correct
    // You can comment these out after the first run
    // migrateProductRatings();
    // cleanupDuplicateReviews();
  }, []);

  return (
    <Router future={router_future}>
      <AuthProvider>
        <LoginRedirect />
        <div className="flex flex-col min-h-screen">
          <Header />
          <Breadcrumbs />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/mobile" element={<MobilePage />} />
              <Route 
                path="/product/:id" 
                element={<ProductPage />} 
              />
              <Route path="/data-accessories" element={<DataPage />} />
              <Route path="/gaming" element={<GamingPage />} />
              <Route path="/tv-audio" element={<TvPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              } />
              {/* Обновляем маршруты для поиска, поддерживая оба параметра */}
              <Route path="/search" element={<SearchResultsPage />} />
              
              {/* Добавляем прямой маршрут для конкретного продукта */}
              <Route 
                path="/product/razer-deathadder" 
                element={<Navigate to="/product/razer-deathadder-wiredwireless-2022-black" replace />} 
              />
              
              {/* Добавляем прямые маршруты для продуктов Razer V3 Pro */}
              <Route 
                path="/product/razer-v3" 
                element={<Navigate to="/product/razer-viper-v3-pro-wireless-2023-black" replace />} 
              />
              <Route 
                path="/product/razer-viper-v3" 
                element={<Navigate to="/product/razer-viper-v3-pro-wireless-2023-black" replace />} 
              />
              <Route 
                path="/product/razer-viper-pro" 
                element={<Navigate to="/product/razer-viper-v3-pro-wireless-2023-black" replace />} 
              />
              {/* Добавляем маршрут для отладки ключевых слов */}
              <Route path="/admin/debug-keywords" element={
                <AdminRoute>
                  <KeywordDebugger />
                </AdminRoute>
              } />
              <Route path="/laptops" element={<LaptopsPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;