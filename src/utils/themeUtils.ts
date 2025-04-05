// Theme options supported by our application
export type Theme = 'light' | 'dark' | 'synthwave';

// Set theme in both localStorage and HTML data attribute
export const setTheme = (theme: Theme): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also add/remove dark class for additional styling if needed
    if (theme === 'dark' || theme === 'synthwave') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

// Get the current theme from localStorage or return default
export const getTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('theme') as Theme) || 'light';
  }
  return 'light';
};

// Toggle between light and dark themes
export const toggleTheme = (): void => {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
};

// Initialize theme on application load
export const initializeTheme = (): void => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check if user prefers dark mode
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDarkMode ? 'dark' : 'light');
    }
  }
};
