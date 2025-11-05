import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const hapticFeedback = {
  light: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.log('Haptics not available');
    }
  },
  medium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.log('Haptics not available');
    }
  },
  heavy: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log('Haptics not available');
    }
  },
  success: async () => {
    try {
      await Haptics.notification({ type: 'SUCCESS' });
    } catch (e) {
      console.log('Haptics not available');
    }
  },
  warning: async () => {
    try {
      await Haptics.notification({ type: 'WARNING' });
    } catch (e) {
      console.log('Haptics not available');
    }
  },
  error: async () => {
    try {
      await Haptics.notification({ type: 'ERROR' });
    } catch (e) {
      console.log('Haptics not available');
    }
  }
};
