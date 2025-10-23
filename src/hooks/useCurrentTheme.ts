import { useState, useEffect } from 'react';

export const useCurrentTheme = () => {
  const [theme, setTheme] = useState('gray');

  useEffect(() => {
    const savedTheme = localStorage.getItem('able-theme') || 'gray';
    setTheme(savedTheme);

    // Listen for theme changes
    const handleThemeChange = () => {
      const newTheme = localStorage.getItem('able-theme') || 'gray';
      setTheme(newTheme);
    };

    window.addEventListener('storage', handleThemeChange);
    
    // Custom event for theme changes within same tab
    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  return theme;
};
