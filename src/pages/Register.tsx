import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { useNavigate, Link } from 'react-router-dom';
import { createCustomUserId } from '../utils/generateUserId';

interface RegisterFormData {
  nickname: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    nickname: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNicknameChecking, setIsNicknameChecking] = useState(false);
  const [isNicknameAvailable, setIsNicknameAvailable] = useState<boolean | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const checkNicknameAvailability = async (nickname: string) => {
    setIsNicknameChecking(true);
    const db = getDatabase();
    const nicknameRef = ref(db, `nicknames/${nickname}`);
    const snapshot = await get(nicknameRef);
    setIsNicknameAvailable(!snapshot.exists());
    setIsNicknameChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const auth = getAuth();
      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const customUserId = createCustomUserId(formData.email);
      const db = getDatabase();
      const userRef = ref(db, `users/${customUserId}`);

      await set(userRef, {
        nickname: formData.nickname,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        customUserId,
        createdAt: new Date().toISOString()
      });

      await sendEmailVerification(user);
      alert('Registration successful! Please check your email to verify your account.');
      navigate('/login');

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join us today and enjoy all features
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            {/* Nickname field */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
                Nickname
              </label>
              <div className="relative">
                <input
                  id="nickname"
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  onBlur={() => checkNicknameAvailability(formData.nickname)}
                  className={`appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 sm:text-sm ${
                    isNicknameAvailable === true ? 'border-green-500 focus:ring-green-500' :
                    isNicknameAvailable === false ? 'border-red-500 focus:ring-red-500' :
                    'border-gray-300 focus:ring-[#003D2D]'
                  }`}
                  placeholder="Choose your nickname"
                  required
                  minLength={3}
                />
                {isNicknameChecking ? (
                  <span className="absolute right-2 top-2">
                    <span className="loading loading-spinner loading-sm text-gray-400"></span>
                  </span>
                ) : isNicknameAvailable !== null && (
                  <span className={`absolute right-2 top-2 text-sm ${
                    isNicknameAvailable ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {isNicknameAvailable ? '✓ Available' : '✗ Taken'}
                  </span>
                )}
              </div>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003D2D] focus:border-[#003D2D] sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003D2D] focus:border-[#003D2D] sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003D2D] focus:border-[#003D2D] sm:text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password fields */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003D2D] focus:border-[#003D2D] sm:text-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters long</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003D2D] focus:border-[#003D2D] sm:text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
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
              disabled={isLoading || !isNicknameAvailable}
            >
              {isLoading && (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <span className="loading loading-spinner loading-sm"></span>
                </span>
              )}
              {isLoading ? 'Creating account...' : 'Register Now'}
            </button>

            <div className="text-center text-sm">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-[#003D2D] hover:text-[#004D3D] transition-colors duration-200">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;