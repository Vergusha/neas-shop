// Theme options supported by our application
export type Theme = 'light' | 'dark' | 'synthwave';

/**
 * Returns the current theme based on localStorage
 * @returns 'light' or 'dark' depending on current theme
 */
export const getTheme = (): 'light' | 'dark' => {
  // Check localStorage first
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
  
  // If theme is set in localStorage, return it
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }
  
  // Otherwise check if the user has a system preference for dark mode
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  // Default to light theme if nothing else matches
  return 'light';
};

/**
 * Sets the theme in localStorage and updates HTML data-theme attribute
 * @param theme 'light' or 'dark'
 */
export const setTheme = (theme: 'light' | 'dark'): void => {
  // Save to localStorage
  localStorage.setItem('theme', theme);
  
  // Update HTML attribute
  document.documentElement.setAttribute('data-theme', theme);
  
  // Add or remove dark class
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-mode');
  }
  
  // Dispatch event to notify components
  window.dispatchEvent(new Event('themeChanged'));
};

/**
 * Toggles between light and dark themes
 */
export const toggleTheme = (): void => {
  const currentTheme = getTheme();
  setTheme(currentTheme === 'light' ? 'dark' : 'light');
};

/**
 * Initialize theme on application load
 */
export const initializeTheme = (): void => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check if user prefers dark mode
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDarkMode ? 'dark' : 'light');
    }
  }
};
