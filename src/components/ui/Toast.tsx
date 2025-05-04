import React, { useEffect, useState } from 'react';
import { getTheme } from '../../utils/themeUtils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // After animation completes
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          light: {
            bg: 'bg-green-50',
            border: 'border-green-500',
            text: 'text-green-800',
            icon: 'text-green-500',
          },
          dark: {
            bg: 'bg-green-900/30',
            border: 'border-green-600',
            text: 'text-green-200',
            icon: 'text-green-400',
          },
        };
      case 'error':
        return {
          light: {
            bg: 'bg-red-50',
            border: 'border-red-500',
            text: 'text-red-800',
            icon: 'text-red-500',
          },
          dark: {
            bg: 'bg-red-900/30',
            border: 'border-red-600',
            text: 'text-red-200',
            icon: 'text-red-400',
          },
        };
      case 'warning':
        return {
          light: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-500',
            text: 'text-yellow-800',
            icon: 'text-yellow-500',
          },
          dark: {
            bg: 'bg-yellow-900/30',
            border: 'border-yellow-600',
            text: 'text-yellow-200',
            icon: 'text-yellow-400',
          },
        };
      default: // info
        return {
          light: {
            bg: 'bg-blue-50',
            border: 'border-blue-500',
            text: 'text-blue-800',
            icon: 'text-blue-500',
          },
          dark: {
            bg: 'bg-blue-900/30',
            border: 'border-blue-600',
            text: 'text-blue-200',
            icon: 'text-blue-400',
          },
        };
    }
  };

  const styles = getTypeStyles();
  const typeStyles = currentTheme === 'dark' ? styles.dark : styles.light;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className={`h-5 w-5 ${typeStyles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'error':
        return (
          <svg className={`h-5 w-5 ${typeStyles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`h-5 w-5 ${typeStyles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default: // info
        return (
          <svg className={`h-5 w-5 ${typeStyles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`fixed z-50 top-4 right-4 flex items-center p-4 max-w-sm border rounded-md shadow-lg transition-all duration-300 ${
        typeStyles.bg
      } ${typeStyles.border} ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="flex-shrink-0 mr-3">{getIcon()}</div>
      <div className={`text-sm font-medium ${typeStyles.text}`}>{message}</div>
      <button
        type="button"
        className={`ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 p-1.5 inline-flex h-8 w-8 ${
          currentTheme === 'dark' 
            ? 'hover:bg-gray-700 focus:ring-gray-600' 
            : 'hover:bg-gray-100 focus:ring-gray-300'
        } ${typeStyles.text}`}
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

export default Toast;
