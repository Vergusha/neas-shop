import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, update } from 'firebase/database';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-lg rounded-xl">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Welcome back!</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003D2D] focus:border-[#003D2D] sm:text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003D2D] focus:border-[#003D2D] sm:text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-4 border-l-4 border-red-400 bg-red-50">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#003D2D] hover:bg-[#004D3D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003D2D] transition-all duration-200 text-base shadow-md"
              disabled={isLoading}
            >
              {isLoading && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="loading loading-spinner loading-sm"></span>
                </span>
              )}
              {isLoading ? 'Signing in...' : 'Login Now'}
            </button>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a href="#" className="font-medium text-[#003D2D] hover:text-[#004D3D] transition-colors duration-200">
                  Forgot your password?
                </a>
              </div>
            </div>
          </div>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-500 bg-white">New to our store?</span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/register"
              className="inline-flex justify-center w-full px-4 py-3 text-sm font-medium border rounded-md border-[#003D2D] text-[#003D2D] hover:bg-[#003D2D] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003D2D] transition-all duration-200 text-base shadow-md"
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