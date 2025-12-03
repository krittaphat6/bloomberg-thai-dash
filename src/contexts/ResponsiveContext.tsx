import React, { createContext, useContext } from 'react';
import { useResponsive, ResponsiveState } from '@/hooks/useResponsive';

const ResponsiveContext = createContext<ResponsiveState | null>(null);

export const ResponsiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const responsive = useResponsive();
  return (
    <ResponsiveContext.Provider value={responsive}>
      {children}
    </ResponsiveContext.Provider>
  );
};

export const useResponsiveContext = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsiveContext must be used within ResponsiveProvider');
  }
  return context;
};
