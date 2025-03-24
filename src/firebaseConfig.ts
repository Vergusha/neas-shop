import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdKE4Qpl1YGMMcU7-dtqPAjsqo0Bn43h4",
  authDomain: "neas-shop-e878c.firebaseapp.com",
  databaseURL: "https://neas-shop-e878c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "neas-shop-e878c",
  storageBucket: "neas-shop-e878c.appspot.com",
  messagingSenderId: "1002686912721",
  appId: "1:1002686912721:web:40d4f887f2fa21e1f64df0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
auth.useDeviceLanguage();
setPersistence(auth, browserLocalPersistence).catch(console.error);

const db = getFirestore(app);
const database = getDatabase(app);

export { db, database, auth, app };

// Добавляем обработчик ошибок для Firestore
export const handleFirestoreError = (error: any): void => {
  console.error('Firestore error:', error);
  
  // Обрабатываем конкретные ошибки
  if (error?.code === 'failed-precondition' || error?.code === 'unavailable') {
    console.warn('Firestore connection issue detected. Attempting reconnect...');
    // Можно реализовать логику переподключения здесь
  }
};

// Улучшенная обработка соединений
export const setupFirebaseErrorHandling = (): void => {
  // Обработка глобальных ошибок сети при работе с Firebase
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error?.message?.includes('firestore') || 
        error?.message?.includes('firebase') || 
        error?.code?.includes('firestore')) {
      console.warn('Unhandled Firebase rejection:', error);
      // Предотвращаем отображение необработанной ошибки
      event.preventDefault();
    }
  });
  
  // Перехватываем ошибки 400 при закрытии соединений
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = input.toString();
    
    // Если это запрос к Firebase/Firestore с terminate, игнорируем возможные ошибки
    if (url.includes('firestore.googleapis.com') && url.includes('terminate')) {
      return originalFetch(input, init).catch(err => {
        console.warn('Ignoring Firebase terminate connection error:', err);
        // Возвращаем пустой ответ вместо ошибки
        return new Response(JSON.stringify({}), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      });
    }
    
    return originalFetch(input, init);
  };
};

// Добавим функцию для проверки анонимного доступа к Firestore
export const ensureFirestoreAccess = (): void => {
  // Firebase Security Rules должны разрешать чтение для неаутентифицированных пользователей
  // для коллекций products, mobile, tv, и т.д.
  
  // Включаем персистентность через правильный метод из библиотеки
  try {
    // Правильный способ включить персистентность в новой версии Firebase
    enableIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          // Несколько вкладок открыты, персистентность можно включить только в одной
          console.warn('Firebase persistence could not be enabled: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          // Текущий браузер не поддерживает все функции, необходимые для персистентности
          console.warn('Firebase persistence is not available in this browser');
        } else {
          console.error('Error enabling persistence:', err);
        }
      });
  } catch (e) {
    // Если что-то пошло не так, просто логируем ошибку, но не блокируем работу приложения
    console.warn('Could not initialize Firestore persistence:', e);
  }
};