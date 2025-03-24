import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { database } from '../firebaseConfig';
import { createCustomUserId } from '../utils/generateUserId';
import LoginRedirect from '../components/LoginRedirect';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const auth = getAuth();
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Successfully authenticated user:", user.email);

      // Check if user exists in database
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        console.log("Creating new user entry in database");
        // If user doesn't exist in database, create new entry
        await set(userRef, {
          email: user.email,
          customUserId: createCustomUserId(email),
          createdAt: new Date().toISOString()
        });
      }

      // Store user data in localStorage
      const userData = snapshot.exists() ? snapshot.val() : {};
      localStorage.setItem('userProfile', JSON.stringify(userData));
      
      // Make sure the auth state has propagated before redirecting
      setTimeout(() => {
        setIsLoading(false);
        navigate('/profile');
      }, 500);
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || 'Failed to login. Please check your credentials and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Добавляем компонент перенаправления */}
      <LoginRedirect />
      
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      
      <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full input input-bordered"
            required
            disabled={isLoading}
          />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full input input-bordered"
            required
            disabled={isLoading}
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm mr-2"></span>
          ) : null}
          Login
        </button>
        
        <div className="mt-4 text-center text-sm">
          <p>Don't have an account? <a href="/register" className="text-primary hover:underline">Register here</a></p>
        </div>
      </form>
    </div>
  );
};

export default Login;