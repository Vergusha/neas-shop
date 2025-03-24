import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const LoginRedirect: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const auth = getAuth();
    
    // Проверяем статус авторизации
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Если пользователь вошел, проверяем, есть ли сохраненный путь для перенаправления
        const redirectPath = sessionStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          // Очищаем сохраненный путь
          sessionStorage.removeItem('redirectAfterLogin');
          // Перенаправляем пользователя на сохраненную страницу
          navigate(redirectPath);
        }
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);
  
  return null;
};

export default LoginRedirect;
