# Bloomberg Thai Dashboard - iOS Mobile Guide

## Overview
This guide explains the mobile-optimized features and interactions available on iOS devices.

## Mobile UX Features

### ✅ Touch-Friendly Interface
- All buttons and interactive elements meet iOS standards (minimum 44x44px tap targets)
- Larger font sizes (16px base) prevent auto-zoom on input focus
- Increased padding and spacing for easier touch interaction

### ✅ Haptic Feedback
The app provides tactile feedback for user interactions:

#### Available Haptic Types:
- **Light**: Quick tap feedback on buttons and interactive elements
- **Medium**: Moderate feedback for significant actions
- **Heavy**: Strong feedback for important actions
- **Success**: Positive confirmation feedback
- **Warning**: Cautionary feedback
- **Error**: Negative feedback for errors

#### Haptic Usage Examples:
```typescript
import { hapticFeedback } from '@/utils/haptics';

// Light tap feedback (default for buttons)
await hapticFeedback.light();

// Success notification
await hapticFeedback.success();

// Error notification
await hapticFeedback.error();
```

### ✅ Swipe Gestures
Navigate and interact with the dashboard using natural iOS gestures.

#### Implementing Swipe Gestures:
```typescript
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useRef } from 'react';

const containerRef = useRef<HTMLDivElement>(null);

useSwipeGesture(containerRef, {
  onSwipeLeft: () => {
    // Handle swipe left (e.g., next panel)
    hapticFeedback.light();
  },
  onSwipeRight: () => {
    // Handle swipe right (e.g., previous panel)
    hapticFeedback.light();
  },
  onSwipeUp: () => {
    // Handle swipe up
  },
  onSwipeDown: () => {
    // Handle swipe down
  }
}, 50); // threshold in pixels
```

### ✅ Responsive Layout

#### Mobile Portrait Mode (< 768px width):
- Single-column grid layout for better readability
- Full-width panels stacked vertically
- Larger text sizes and touch targets
- Optimized spacing for thumb navigation

#### Mobile Landscape Mode:
- Two-column grid layout
- Compact spacing to maximize screen usage
- Maintained readability and touch targets

#### Desktop Mode (≥ 769px width):
- Original 6-column grid layout
- Compact design optimized for larger screens
- Smaller font sizes for information density

### ✅ iOS-Specific Optimizations

#### Safe Area Support:
The app respects iOS safe areas (notch, home indicator):
```css
/* Automatically handles safe areas */
body {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

#### Smooth Scrolling:
All scrollable areas use iOS momentum scrolling:
```css
.scrollable {
  -webkit-overflow-scrolling: touch;
}
```

#### No Double-Tap Zoom:
Buttons prevent accidental double-tap zoom:
```css
button {
  touch-action: manipulation;
}
```

## Mobile Navigation Tips

### 📱 Portrait Mode (Recommended)
- Scroll vertically to view all panels
- Tap any panel to interact
- Use native iOS back gesture from screen edge
- Pull down to refresh (if implemented)

### 📱 Landscape Mode
- Better for viewing multiple panels simultaneously
- Swipe between sections
- Pinch to zoom (where applicable)

## Performance Considerations

### Mobile Optimizations:
1. **Reduced Animations**: Heavy animations are minimized on mobile
2. **Lazy Loading**: Components load on-demand to save bandwidth
3. **Touch Response**: Immediate visual feedback on touch
4. **Resource Management**: 3D graphics (@react-three/fiber) use fewer resources

## Button Integration

All buttons in the app automatically include haptic feedback. To disable for specific buttons:

```typescript
<Button enableHaptic={false} onClick={handleClick}>
  No Haptic
</Button>
```

Default behavior (haptic enabled):
```typescript
<Button onClick={handleClick}>
  With Haptic
</Button>
```

## Accessibility

- All interactive elements meet WCAG touch target size guidelines
- Color contrast ratios maintained across themes
- Screen reader compatible (VoiceOver support)
- Reduced motion support for users with motion sensitivity

## Testing on iOS

### Recommended Testing:
1. **Physical Device**: Test on actual iPhone for best haptic feedback experience
2. **iOS Simulator**: Use Xcode simulator for basic UI testing
3. **Safari Browser**: Test in mobile Safari for web compatibility
4. **Different Screen Sizes**: Test on various iPhone models (SE, standard, Max)

### Haptics Availability:
- Haptics work on physical iOS devices with Taptic Engine
- Haptics gracefully fail (no effect) in browsers and simulators
- No errors thrown when haptics unavailable

## Browser Compatibility

### iOS Safari (Recommended):
- Full haptic feedback support (via Capacitor)
- Native scrolling and gestures
- Optimal performance

### Other Mobile Browsers:
- Touch gestures work universally
- Haptic feedback may be limited
- Core functionality fully supported

## Troubleshooting

### Haptics Not Working:
1. Ensure device has Taptic Engine (iPhone 7 and later)
2. Check device Settings → Sounds & Haptics → System Haptics is ON
3. Verify app is built with Capacitor iOS integration

### Layout Issues:
1. Clear browser cache
2. Check viewport meta tag is present
3. Disable browser zoom if accidentally triggered

### Touch Not Responding:
1. Ensure no conflicting touch event handlers
2. Check for CSS `pointer-events: none` on parent elements
3. Verify touch-action CSS property is correct

## Future Enhancements

Planned mobile features:
- [ ] Bottom tab navigation bar
- [ ] Drawer menu for secondary navigation
- [ ] Pull-to-refresh functionality
- [ ] Offline mode support
- [ ] Enhanced gesture controls
- [ ] iOS shortcuts and widgets

## Support

For issues or questions:
1. Check this documentation first
2. Review the codebase examples
3. Test on physical iOS device
4. Report issues with device model and iOS version

---

**Last Updated**: 2025-11-05  
**Compatible iOS Version**: iOS 14.0+  
**Recommended**: iOS 16.0+ for best experience
