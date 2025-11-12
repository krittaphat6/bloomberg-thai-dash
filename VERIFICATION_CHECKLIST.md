# iOS Setup Verification Checklist

Use this checklist to verify that iOS support has been properly configured.

## ✅ Configuration Files

- [ ] `capacitor.config.ts` exists and contains:
  - [ ] appId: `com.krittaphat6.bloombergthaidash`
  - [ ] appName: `Bloomberg Thai Dash`
  - [ ] webDir: `dist`
  - [ ] ios.contentInset: `always`

- [ ] `package.json` includes:
  - [ ] @capacitor/core dependency
  - [ ] @capacitor/cli dependency
  - [ ] @capacitor/ios dependency
  - [ ] npm script: `ios:init`
  - [ ] npm script: `ios:sync`
  - [ ] npm script: `ios:open`
  - [ ] npm script: `ios:build`

- [ ] `vite.config.ts` includes:
  - [ ] build.outDir: `dist`
  - [ ] base: `./`

- [ ] `index.html` includes:
  - [ ] viewport meta with `viewport-fit=cover`
  - [ ] `apple-mobile-web-app-capable`
  - [ ] `apple-mobile-web-app-status-bar-style`
  - [ ] `apple-mobile-web-app-title`

- [ ] `src/index.css` includes:
  - [ ] Safe area insets for #root
  - [ ] Terminal grid height adjusted for safe areas

- [ ] `.gitignore` includes:
  - [ ] `ios/App/Pods/`
  - [ ] `ios/App/*.xcworkspace`
  - [ ] iOS build artifacts

## ✅ Documentation

- [ ] `README_IOS.md` exists with iOS setup instructions
- [ ] `IOS_SETUP.md` exists with directory structure guide
- [ ] `README.md` updated with iOS section
- [ ] `.env.example` created

## ✅ Prerequisites (macOS only)

- [ ] macOS operating system
- [ ] Xcode 14+ installed
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] CocoaPods installed (`sudo gem install cocoapods`)

## ✅ Initial Setup Commands

Run these commands in order:

```bash
# 1. Install dependencies
npm install

# Expected output: Dependencies installed successfully (may take a few minutes)
```

```bash
# 2. Build the web application
npm run build

# Expected output: dist/ directory created with compiled assets
```

```bash
# 3. Initialize iOS project (first time only)
npm run ios:init

# Expected output: ios/App/ directory created with Xcode project
```

```bash
# 4. Install CocoaPods dependencies
cd ios/App
pod install
cd ../..

# Expected output: Pods installed, *.xcworkspace created
```

```bash
# 5. Sync web assets to iOS
npm run ios:sync

# Expected output: Assets copied to ios/App/App/public/
```

```bash
# 6. Open in Xcode
npm run ios:open

# Expected output: Xcode launches with the project
```

## ✅ Xcode Verification

Once Xcode opens:

- [ ] Project name shows "App"
- [ ] Bundle Identifier is `com.krittaphat6.bloombergthaidash`
- [ ] Display Name is "Bloomberg Thai Dash"
- [ ] Deployment Target is iOS 13.0 or higher
- [ ] Signing is configured (if testing on device)

## ✅ Build and Run

In Xcode:

1. [ ] Select a simulator (e.g., iPhone 15 Pro)
2. [ ] Click the Play button or press Cmd+R
3. [ ] App builds without errors
4. [ ] Simulator launches
5. [ ] App loads and displays correctly
6. [ ] No console errors in Xcode output

## ✅ Testing Checklist

Once the app is running:

- [ ] Password screen appears (if authentication is enabled)
- [ ] After authentication, main dashboard loads
- [ ] UI respects iOS safe areas (no content under notch)
- [ ] Scrolling works smoothly
- [ ] 3D components render correctly (WebGL support)
- [ ] TradingView widgets load (if applicable)
- [ ] Navigation between pages works
- [ ] Status bar style is correct (black-translucent)

## ✅ Safari Web Inspector (for debugging)

- [ ] Enable Web Inspector on iOS device (Settings → Safari → Advanced)
- [ ] Connect device to Mac
- [ ] Safari → Develop → [Device] → [App] shows console
- [ ] No JavaScript errors in console
- [ ] Network requests complete successfully
- [ ] Environment variables are loaded

## 🐛 Common Issues

If something doesn't work, check:

1. **Build fails in Xcode:**
   - Clean build folder: Cmd+Shift+K
   - Delete DerivedData
   - Run `pod install` again

2. **White screen on iOS:**
   - Check base path in vite.config.ts is `./`
   - Verify `npm run build` completed successfully
   - Re-run `npm run ios:sync`
   - Check Safari Web Inspector for errors

3. **CocoaPods errors:**
   - Update CocoaPods: `sudo gem install cocoapods`
   - Update repo: `pod repo update`
   - Clean and reinstall: `rm -rf Pods Podfile.lock && pod install`

4. **Signing errors:**
   - Add Apple ID in Xcode → Settings → Accounts
   - Select Team in project settings → Signing & Capabilities
   - Enable "Automatically manage signing"

## ✅ Final Verification

- [ ] App builds and runs on iOS Simulator
- [ ] App builds and runs on physical device (optional)
- [ ] All features work as expected
- [ ] No errors in Xcode console
- [ ] Performance is acceptable
- [ ] UI looks correct on different device sizes

## 🎉 Success!

If all checks pass, iOS support is fully configured and working!

For issues, refer to:
- README_IOS.md (detailed setup guide)
- IOS_SETUP.md (directory structure)
- [Capacitor Documentation](https://capacitorjs.com/docs)
