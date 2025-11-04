# iOS Setup Guide for Bloomberg Thai Dash

This guide will walk you through setting up and running the Bloomberg Thai Dash application on iOS devices using Capacitor.

## Prerequisites

### Required Software
- **macOS** (required for Xcode)
- **Xcode 14+** - [Download from App Store](https://apps.apple.com/us/app/xcode/id497799835)
- **Node.js 18+** and npm
- **CocoaPods** - Install with: `sudo gem install cocoapods`

### Optional but Recommended
- **Apple Developer Account** (required for testing on physical devices and App Store distribution)
- **iOS Device** with USB cable (for physical device testing)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- `@capacitor/core` - Capacitor core library
- `@capacitor/cli` - Capacitor CLI tools
- `@capacitor/ios` - iOS platform support

### 2. Build the Web Application

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory that Capacitor will use.

### 3. Initialize iOS Project (First Time Only)

```bash
npm run ios:init
```

This command runs `npx cap add ios` which:
- Creates the `ios/` directory
- Generates the Xcode project
- Sets up the iOS app structure with the Bundle ID: `com.krittaphat6.bloombergthaidash`

### 4. Sync Web Assets to iOS

```bash
npm run ios:sync
```

This command:
- Copies the built web assets from `dist/` to the iOS project
- Updates native dependencies
- Synchronizes Capacitor plugins

### 5. Open in Xcode

```bash
npm run ios:open
```

This opens the iOS project in Xcode.

## Development Workflow

### Making Changes to Web Code

1. Make your changes to the React/TypeScript code
2. Build the project:
   ```bash
   npm run build
   ```
3. Sync to iOS:
   ```bash
   npm run ios:sync
   ```
4. In Xcode, press `Cmd+R` to rebuild and run

**Tip:** Use the combined command:
```bash
npm run ios:build
```
This runs both build and sync in one command.

### Testing in iOS Simulator

1. Open Xcode (if not already open):
   ```bash
   npm run ios:open
   ```
2. Select a simulator from the device dropdown (e.g., "iPhone 15 Pro")
3. Press `Cmd+R` or click the Play button to build and run
4. The app will launch in the iOS Simulator

### Testing on Physical Device

1. Connect your iOS device via USB
2. Open Xcode
3. Select your device from the device dropdown
4. **First time only:** 
   - Go to Xcode → Settings → Accounts
   - Add your Apple ID
   - In the project settings, select your Team under "Signing & Capabilities"
5. Press `Cmd+R` to build and run on your device

**Note:** You may need to trust the developer certificate on your device:
- Settings → General → VPN & Device Management → Trust your developer certificate

## Configuration

### Bundle ID and App Name

These are configured in `capacitor.config.ts`:
- **App ID:** `com.krittaphat6.bloombergthaidash`
- **App Name:** `Bloomberg Thai Dash`

To change these, edit `capacitor.config.ts` and run `npm run ios:sync`.

### Environment Variables

The app uses Supabase for backend services. Ensure your `.env` file is properly configured:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important:** Environment variables are embedded during build time. Rebuild after changing `.env`:
```bash
npm run ios:build
```

## iOS-Specific Features

### Safe Area Handling

The app automatically handles iOS safe areas (notch, home indicator) using:
- `viewport-fit=cover` in the viewport meta tag
- CSS `env(safe-area-inset-*)` variables
- Capacitor's `contentInset: 'always'` configuration

### Status Bar

The status bar is configured to use `black-translucent` style, which overlays the content with a translucent background.

### WebGL Support

The app uses `@react-three/fiber` for 3D components. WebGL is fully supported on iOS Safari and should work without issues.

### TradingView Widget

The TradingView widget uses iframes. These work on iOS but ensure you have proper CORS and iframe policies configured.

## Troubleshooting

### Issue: "No Provisioning Profile Found"

**Solution:**
1. Open Xcode
2. Select the project in the navigator
3. Go to "Signing & Capabilities"
4. Check "Automatically manage signing"
5. Select your Team (Apple Developer account)

### Issue: "Could not install Pods"

**Solution:**
```bash
cd ios/App
pod repo update
pod install
cd ../..
```

### Issue: Build fails with CocoaPods errors

**Solution:**
```bash
# Update CocoaPods
sudo gem install cocoapods

# Clean and reinstall
cd ios/App
rm -rf Pods Podfile.lock
pod install
cd ../..
```

### Issue: Changes not reflecting in app

**Solution:**
Always rebuild and sync after code changes:
```bash
npm run ios:build
```

Then rebuild in Xcode (`Cmd+R`).

### Issue: Blank white screen on iOS

**Possible causes:**
1. **Base path issue:** Check `vite.config.ts` has `base: './'`
2. **Build not synced:** Run `npm run ios:sync`
3. **Console errors:** Check Safari Web Inspector for errors
   - On Mac: Safari → Develop → [Your iOS Device] → [App]

### Issue: App crashes on startup

**Solution:**
1. Check Xcode console for error messages
2. Verify all dependencies are installed: `npm install`
3. Clean build folder in Xcode: `Cmd+Shift+K`
4. Rebuild: `Cmd+R`

## Debugging

### Using Safari Web Inspector

1. On iOS device: Settings → Safari → Advanced → Enable "Web Inspector"
2. On Mac: Safari → Settings → Advanced → Show "Develop menu"
3. Connect device and run app
4. Safari → Develop → [Your Device] → [App Name]

This gives you full console, network, and DOM inspection tools.

### Xcode Console

View native logs and errors in Xcode's console at the bottom of the window.

## App Store Submission

### 1. Prepare for Release

1. Update version and build numbers in Xcode
2. Add app icons (Assets.xcassets → AppIcon)
3. Add launch screen/splash screen
4. Configure app capabilities and permissions

### 2. Create Screenshots

Use the iOS Simulator to take screenshots for various device sizes required by App Store Connect.

### 3. Archive and Upload

1. In Xcode, select "Any iOS Device"
2. Product → Archive
3. Window → Organizer → Archives
4. Select archive and click "Distribute App"
5. Follow the wizard to upload to App Store Connect

### 4. App Store Connect

Complete all required metadata and submit for review at [App Store Connect](https://appstoreconnect.apple.com).

## iOS-Specific Code Considerations

### Detecting iOS Platform

You can detect if the app is running on iOS using Capacitor's platform detection:

```typescript
import { Capacitor } from '@capacitor/core';

const isIOS = Capacitor.getPlatform() === 'ios';
const isNative = Capacitor.isNativePlatform();
```

### Handling Device Features

For iOS-specific features (camera, geolocation, etc.), you'll need to add the appropriate permissions to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access</string>
```

### Status Bar Plugin (Optional)

If you need to control the status bar, install the plugin:

```bash
npm install @capacitor/status-bar
npx cap sync ios
```

Then use in your code:
```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

// Hide the status bar
await StatusBar.hide();

// Change status bar style
await StatusBar.setStyle({ style: Style.Dark });
```

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Developer Documentation](https://developer.apple.com/documentation)
- [Xcode User Guide](https://developer.apple.com/documentation/xcode)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Capacitor iOS Platform](https://capacitorjs.com/docs/ios)

## Quick Reference Commands

```bash
# Full workflow (after making code changes)
npm run build              # Build web app
npm run ios:sync           # Sync to iOS
npm run ios:open           # Open Xcode

# Or combined
npm run ios:build          # Build + Sync

# First time setup
npm install                # Install dependencies
npm run build              # Build web app
npm run ios:init           # Create iOS project (first time only)
npm run ios:sync           # Sync web assets
npm run ios:open           # Open in Xcode
```

## Known Limitations

1. **macOS Required:** iOS development requires macOS and Xcode
2. **Physical Device Testing:** Requires Apple Developer account ($99/year)
3. **App Store Distribution:** Requires paid Apple Developer account
4. **Hot Reload:** Not available; must rebuild and sync for changes

## Support

For issues specific to:
- **Capacitor:** Check [Capacitor Forums](https://forum.ionicframework.com/c/capacitor)
- **iOS Development:** Check [Apple Developer Forums](https://developer.apple.com/forums/)
- **This App:** Create an issue in the GitHub repository
