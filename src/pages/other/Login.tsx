import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, update } from 'firebase/database';
import { getTheme } from '../../utils/themeUtils';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const navigate = useNavigate();
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const auth = getAuth();
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      const db = getDatabase();
      const userRef = ref(db, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
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

      navigate('/profile');
    } catch (error) {
      setError('Failed to login. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen px-4 py-12 ${
      currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    } sm:px-6 lg:px-8`}>
      <div className={`w-full max-w-md p-8 space-y-8 shadow-lg rounded-xl ${
        currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
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
                    ? 'bg-gray-700 text-gray-200 border-gray-600 focus:ring-[#95c672] focus:border-[#95c672]' 
                    : 'border-gray-300 focus:ring-[#003D2D] focus:border-[#003D2D]'
                }`}
                placeholder="email@example.com"
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
                    ? 'bg-gray-700 text-gray-200 border-gray-600 focus:ring-[#95c672] focus:border-[#95c672]' 
                    : 'border-gray-300 focus:ring-[#003D2D] focus:border-[#003D2D]'
                }`}
                placeholder="••••••••"
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
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent font-medium rounded-md text-white transition-all duration-200 text-base shadow-md ${
                currentTheme === 'dark'
                  ? 'bg-[#95c672] hover:bg-[#7fb356] focus:ring-[#95c672]'
                  : 'bg-[#003D2D] hover:bg-[#004D3D] focus:ring-[#003D2D]'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                currentTheme === 'dark' ? 'focus:ring-offset-gray-800' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className={`loading loading-spinner loading-sm ${
                    currentTheme === 'dark' ? 'text-gray-200' : ''
                  }`}></span>
                </span>
              )}
              {isLoading ? 'Signing in...' : 'Login Now'}
            </button>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a href="#" className={`font-medium ${
                  currentTheme === 'dark'
                    ? 'text-[#95c672] hover:text-[#a6d383]'
                    : 'text-[#003D2D] hover:text-[#004D3D]'
                } transition-colors duration-200`}>
                  Forgot your password?
                </a>
              </div>
            </div>
          </div>
        
          <div className={`mt-6 ${
            currentTheme === 'dark' ? 'border-t border-gray-700' : 'border-t border-gray-200'
          }`}>
            <div className="mt-6 text-center">
              <span className={`text-sm ${
                currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Don't have an account? </span>
              <Link to="/register" className={`font-medium ${
                currentTheme === 'dark'
                  ? 'text-[#95c672] hover:text-[#a6d383]'
                  : 'text-[#003D2D] hover:text-[#004D3D]'
              } transition-colors duration-200`}>
                Sign up now
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;