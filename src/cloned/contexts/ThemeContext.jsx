import React, { createContext, useState, useEffect, useContext } from 'react';

export const ThemeContext = createContext();

// Função para verificar se é noite (entre 18h e 6h)
const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
};

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(isNightTime());

  // Atualizar modo dia/noite automaticamente a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setIsDarkMode(isNightTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Aplicar classe dark ao HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, isNightTime }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
