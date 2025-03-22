import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom'; // Добавляем импорт
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
  const navigate = useNavigate(); // Добавляем хук для навигации
  
  const checkNicknameAvailability = async (nickname: string) => {
    if (nickname.length < 3) {
      setIsNicknameAvailable(null);
      return;
    }
    
    setIsNicknameChecking(true);
    const db = getDatabase();
    
    try {
      // Используем child для получения конкретного никнейма
      const nicknameRef = ref(db, `nicknames/${nickname.toLowerCase()}`);
      const snapshot = await get(nicknameRef);
      setIsNicknameAvailable(!snapshot.exists());
    } catch (error) {
      console.error('Error checking nickname:', error);
      // В случае ошибки доступа, считаем никнейм доступным
      // но логируем ошибку для отладки
      setIsNicknameAvailable(true);
    } finally {
      setIsNicknameChecking(false);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'nickname') {
      await checkNicknameAvailability(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Валидация
      if (!isNicknameAvailable) {
        throw new Error('Nickname is not available');
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
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

      // Сохраняем расширенные данные пользователя
      await set(userRef, {
        uid: user.uid,
        nickname: formData.nickname,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        displayName: `${formData.firstName} ${formData.lastName}`,
        customUserId,
        createdAt: new Date().toISOString(),
        isEmailVerified: false
      });

      // Обновляем профиль в Firebase Auth
      await updateProfile(user, {
        displayName: formData.nickname
      });

      // Резервируем никнейм
      const nicknameRef = ref(db, `nicknames/${formData.nickname.toLowerCase()}`);
      await set(nicknameRef, user.uid);

      // Отправляем email для верификации
      await sendEmailVerification(user);

      // После успешной регистрации
      alert('Registration successful! Please check your email to verify your account.');
      navigate('/login'); // Редирект на страницу логина

    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        // Улучшаем сообщения об ошибках
        const errorMessage = error.message.includes('email-already-in-use') 
          ? 'This email is already registered. Please use a different email or try logging in.'
          : error.message;
        setError(errorMessage);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6">Register</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nickname*
            <div className="mt-1 relative">
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                className={`input input-bordered w-full ${
                  isNicknameAvailable ? 'input-success' : 
                  isNicknameAvailable === false ? 'input-error' : ''
                }`}
                required
                minLength={3}
              />
              {isNicknameChecking && (
                <span className="absolute right-2 top-3">
                  <span className="loading loading-spinner loading-sm"></span>
                </span>
              )}
              {!isNicknameChecking && isNicknameAvailable !== null && (
                <span className={`text-xs ${
                  isNicknameAvailable ? 'text-green-500' : 'text-red-500'
                }`}>
                  {isNicknameAvailable ? 'Available' : 'Already taken'}
                </span>
              )}
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name*
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="mt-1 input input-bordered w-full"
                required
              />
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name*
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="mt-1 input input-bordered w-full"
                required
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email*
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 input input-bordered w-full"
              required
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password*
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="mt-1 input input-bordered w-full"
              required
              minLength={6}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Confirm Password*
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="mt-1 input input-bordered w-full"
              required
            />
          </label>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isLoading || !isNicknameAvailable}
        >
          {isLoading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            'Register'
          )}
        </button>
      </form>
    </div>
  );
};

export default Register;
