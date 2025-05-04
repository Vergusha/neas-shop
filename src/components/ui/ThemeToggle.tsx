import React from 'react';
import { Sun, Moon } from 'lucide-react';

type ThemeToggleProps = {
  currentTheme: 'light' | 'dark' | 'synthwave';
  onToggle: () => void;
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({ currentTheme, onToggle }) => {
  return (
    <button 
      onClick={onToggle}
      className="flex items-center justify-center w-10 h-10 transition-all duration-300 ease-in-out rounded-full hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {currentTheme === 'light' ? (
        <Sun size={24} className="text-white" />
      ) : (
        <Moon size={24} className="text-white" />
      )}
    </button>
  );
};

export default ThemeToggle;