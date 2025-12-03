import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const hapticFeedback = {
  light: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.log('Haptic feedback unavailable - requires physical iOS device with Taptic Engine');
    }
  },
  medium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.log('Haptic feedback unavailable - requires physical iOS device with Taptic Engine');
    }
  },
  heavy: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log('Haptic feedback unavailable - requires physical iOS device with Taptic Engine');
    }
  },
  success: async () => {
    try {
      await Haptics.notification({ type: 'SUCCESS' });
    } catch (e) {
      console.log('Haptic feedback unavailable - requires physical iOS device with Taptic Engine');
    }
  },
  warning: async () => {
    try {
      await Haptics.notification({ type: 'WARNING' });
    } catch (e) {
      console.log('Haptic feedback unavailable - requires physical iOS device with Taptic Engine');
    }
  },
  error: async () => {
    try {
      await Haptics.notification({ type: 'ERROR' });
    } catch (e) {
      console.log('Haptic feedback unavailable - requires physical iOS device with Taptic Engine');
    }
  }
};
