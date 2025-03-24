import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { setupForHosting } from './utils/hostingDetection';
import { setupFirebaseErrorHandling, ensureFirestoreAccess } from './firebaseConfig';

// Настройка для хостинга Firebase с обработкой ошибок
try {
  setupForHosting();
} catch (e) {
  console.warn('Error setting up hosting detection:', e);
}

// Улучшенная обработка ошибок Firebase
try {
  setupFirebaseErrorHandling();
} catch (e) {
  console.warn('Error setting up Firebase error handling:', e);
}

// Включаем персистентность, но оборачиваем в try-catch, чтобы избежать белого экрана
try {
  ensureFirestoreAccess();
} catch (e) {
  console.error('Failed to setup Firestore access:', e);
}

// Рендеринг приложения не должен зависеть от успешности настройки Firebase
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
