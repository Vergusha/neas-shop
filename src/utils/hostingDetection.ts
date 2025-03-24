/**
 * Определяет, работает ли приложение в Firebase Hosting
 */
export const isFirebaseHosting = (): boolean => {
  // Firebase обычно использует домены *.web.app или *.firebaseapp.com
  const hostName = window.location.hostname;
  return hostName.includes('.web.app') || hostName.includes('.firebaseapp.com');
};

/**
 * Настраивает приложение для работы на Firebase Hosting
 */
export const setupForHosting = (): void => {
  if (isFirebaseHosting()) {
    // Добавляем обработчик только для обнаружения перехода,
    // но не вмешиваемся в стандартный механизм React Router
    window.addEventListener('popstate', () => {
      // Не вмешиваемся в основную логику React Router,
      // но можем выполнить дополнительные действия при изменении URL
      
      // Например, отладочный вывод
      console.log('Navigation detected in Firebase hosting environment');
    });
    
    // НЕ переопределяем стандартное поведение history.pushState,
    // так как это может помешать работе React Router
  }
};
