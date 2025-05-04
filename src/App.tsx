import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import MobilePage from './pages/category/MobilePage';
import ProductPage from './pages/navigation/ProductPage';
import DataPage from './pages/other/DataPage';
import GamingPage from './pages/category/GamingPage';
import TvPage from './pages/category/TvPage';
import SupportPage from './pages/category/SupportPage';
import SearchResultsPage from './pages/navigation/SearchResultsPage';
import Register from './pages/other/Register';
import Login from './pages/other/Login';
import ProfilePage from './pages/navigation/ProfilePage';
import FavoritesPage from './pages/navigation/FavoritesPage';
import CartPage from './pages/navigation/CartPage';
import Home from './pages/main/Home';
import Breadcrumbs from './components/layout/Breadcrumbs';
import AdminPanel from './components/admin/AdminPanel';
import { isAdmin } from './utils/constants';
import { getAuth } from 'firebase/auth';
import { AuthProvider } from './utils/AuthProvider';
import LoginRedirect from './components/user/LoginRedirect';
import KeywordDebugger from './utils/KeywordDebugger';
import LaptopsPage from './pages/category/LaptopsPage';
import { initializeTheme, getTheme } from './utils/themeUtils';
import { ProductCardProvider } from './contexts/ProductCardContext';
import { FilterProvider } from './contexts/FilterContext';
import { ReviewProvider } from './contexts/ReviewContext';

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
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  useEffect(() => {
    // Initialize theme on app start
    initializeTheme();
    
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  return (
    <Router future={router_future}>
      <AuthProvider>
        <ProductCardProvider>
          <FilterProvider>
            <ReviewProvider>
              <LoginRedirect />
              <div className={`flex flex-col min-h-screen ${
                currentTheme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
              }`}>
                <Header />
                <Breadcrumbs />
                <main className={`flex-grow ${
                  currentTheme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
                }`}>
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
            </ReviewProvider>
          </FilterProvider>
        </ProductCardProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;