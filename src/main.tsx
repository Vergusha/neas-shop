import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { setupForHosting } from './utils/hostingDetection';
import { ensureFirestoreAccess } from './firebaseConfig';

// Настройка для хостинга Firebase с обработкой ошибок
try {
  setupForHosting();
} catch (e) {
  console.warn('Error setting up hosting detection:', e);
}

// Проверяем доступ к Firestore при запуске приложения
try {
  ensureFirestoreAccess().then(hasAccess => {
    if (hasAccess) {
      console.log('Successfully connected to Firestore');
    } else {
      console.warn('User not authenticated for Firestore access');
    }
  });
} catch (e) {
  console.error('Failed to check Firestore access:', e);
}

// Рендеринг приложения не должен зависеть от успешности настройки Firebase
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
