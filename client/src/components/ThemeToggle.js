import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  const handleClick = () => {
    toggleTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={handleClick}
      className="theme-toggle-btn transition-base"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <FaSun /> : <FaMoon />}
    </button>
  );
};

export default ThemeToggle;
