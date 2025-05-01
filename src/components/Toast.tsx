import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  // Define toast styles based on type
  const toastClasses = {
    success: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800'
  };

  // Define icon based on type
  const Icon = () => {
    switch (type) {
      case 'success':
        return <ShoppingCart className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed z-50 top-4 right-4 animate-slide-in">
      <div className={`p-4 rounded-md border shadow-lg flex items-center ${toastClasses[type]}`}>
        <div className="flex-shrink-0">
          <Icon />
        </div>
        <div className="flex-1 ml-3">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <button
            type="button"
            className="inline-flex text-gray-400 bg-transparent rounded-md hover:text-gray-500"
            onClick={onClose}
            aria-label="Close notification"
            title="Close notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
