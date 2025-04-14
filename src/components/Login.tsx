import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { getDatabase, ref, get, update } from 'firebase/database';
import { getTheme } from '../utils/themeUtils';

const Login: React.FC = () => {
  // Добавляем отслеживание текущей темы
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  
  // Добавляем эффект для отслеживания изменений темы
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const auth = getAuth();
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      const db = getDatabase();
      const emailPrefix = email.split('@')[0].toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/\s+/g, '-');
      
      const userRef = ref(db, `users/${emailPrefix}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        // Обновляем локальное хранилище с данными пользователя
        localStorage.setItem('userProfile', JSON.stringify({
          ...userData,
          lastLogin: new Date().toISOString()
        }));

        if (user.emailVerified) {
          await update(userRef, {
            isEmailVerified: true,
            emailVerifiedAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
        }
      }

      // Redirect or other actions...
    } catch (error) {
      setError('Failed to login. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen px-4 py-12 sm:px-6 lg:px-8 ${
      currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`w-full max-w-md p-8 space-y-8 shadow-lg rounded-xl ${
        currentTheme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white'
      }`}>
        <div className="text-center">
          <h2 className={`mt-6 text-3xl font-extrabold ${
            currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>Welcome back!</h2>
          <p className={`mt-2 text-sm ${
            currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Please sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${
                currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 sm:text-sm ${
                  currentTheme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-[#95c672] focus:border-[#95c672]' 
                    : 'border-gray-300 focus:ring-[#003D2D] focus:border-[#003D2D]'
                }`}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${
                currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 sm:text-sm ${
                  currentTheme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-[#95c672] focus:border-[#95c672]' 
                    : 'border-gray-300 focus:ring-[#003D2D] focus:border-[#003D2D]'
                }`}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className={`p-4 border-l-4 border-red-400 ${
              currentTheme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'
            }`}>
              <div className="flex">
                <div className="ml-3">
                  <p className={`text-sm ${
                    currentTheme === 'dark' ? 'text-red-300' : 'text-red-700'
                  }`}>{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-all duration-200 text-base shadow-md ${
                currentTheme === 'dark'
                  ? 'bg-[#95c672] hover:bg-[#7fb356] focus:ring-[#95c672]'
                  : 'bg-[#003D2D] hover:bg-[#004D3D] focus:ring-[#003D2D]'
              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
              disabled={isLoading}
            >
              {isLoading && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="loading loading-spinner loading-sm"></span>
                </span>
              )}
              {isLoading ? 'Signing in...' : 'Login'}
            </button>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a href="#" className={`font-medium transition-colors duration-200 ${
                  currentTheme === 'dark'
                    ? 'text-[#95c672] hover:text-[#a6d285]'
                    : 'text-[#003D2D] hover:text-[#004D3D]'
                }`}>
                  Forgot your password?
                </a>
              </div>
            </div>
          </div>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${
                currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-300'
              }`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-2 ${
                currentTheme === 'dark' ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-white'
              }`}>New to our store?</span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/register"
              className={`inline-flex justify-center w-full px-4 py-3 text-sm font-medium border rounded-md transition-all duration-200 text-base shadow-md ${
                currentTheme === 'dark'
                  ? 'border-[#95c672] text-[#95c672] hover:bg-[#95c672] hover:text-gray-900 focus:ring-[#95c672]'
                  : 'border-[#003D2D] text-[#003D2D] hover:bg-[#003D2D] hover:text-white focus:ring-[#003D2D]'
              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              Create an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;