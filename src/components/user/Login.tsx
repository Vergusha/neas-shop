import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { getTheme } from '../../utils/themeUtils';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  
  const navigate = useNavigate();
  const auth = getAuth();

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Failed to log in';
      if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
        errorMessage = 'Email address not found';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts, please try again later';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto py-8 ${currentTheme === 'dark' ? 'text-gray-200' : ''}`}>
      <h1 className={`text-3xl font-bold text-center mb-6 ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
        Log In
      </h1>

      <div className={`p-6 rounded-lg shadow-md ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        {error && (
          <div className={`p-3 mb-4 rounded-md ${
            currentTheme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label 
              htmlFor="email" 
              className={`block mb-2 text-sm font-medium ${
                currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                currentTheme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-[#95c672]' 
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-[#003D2D]'
              }`}
              required
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label 
                htmlFor="password" 
                className={`text-sm font-medium ${
                  currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Password
              </label>
              <a 
                href="/forgot-password" 
                className={`text-sm ${
                  currentTheme === 'dark' ? 'text-[#95c672] hover:text-[#85b662]' : 'text-[#003D2D] hover:text-[#004D3D]'
                }`}
              >
                Forgot Password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                currentTheme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-[#95c672]' 
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-[#003D2D]'
              }`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            } ${
              currentTheme === 'dark'
                ? 'bg-[#95c672] hover:bg-[#85b662]'
                : 'bg-[#003D2D] hover:bg-[#004D3D]'
            }`}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className={currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Don't have an account?{' '}
            <Link
              to="/register"
              className={`font-medium ${
                currentTheme === 'dark' ? 'text-[#95c672] hover:text-[#85b662]' : 'text-[#003D2D] hover:text-[#004D3D]'
              }`}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;