import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveState {
  deviceType: DeviceType;
  orientation: Orientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
}

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    let deviceType: DeviceType = 'desktop';
    if (width < BREAKPOINTS.mobile) {
      deviceType = 'mobile';
    } else if (width < BREAKPOINTS.tablet) {
      deviceType = 'tablet';
    }

    return {
      deviceType,
      orientation: width > height ? 'landscape' : 'portrait',
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isTouch,
      screenWidth: width,
      screenHeight: height
    };
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      let deviceType: DeviceType = 'desktop';
      if (width < BREAKPOINTS.mobile) {
        deviceType = 'mobile';
      } else if (width < BREAKPOINTS.tablet) {
        deviceType = 'tablet';
      }

      setState({
        deviceType,
        orientation: width > height ? 'landscape' : 'portrait',
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop',
        isTouch,
        screenWidth: width,
        screenHeight: height
      });
    };

    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
}
