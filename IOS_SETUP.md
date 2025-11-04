# iOS Directory Structure

After running `npm run ios:init`, the following directory structure will be created:

```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   ├── Info.plist
│   │   ├── Assets.xcassets/
│   │   │   └── AppIcon.appiconset/
│   │   └── config.xml
│   ├── App.xcodeproj/
│   ├── App.xcworkspace/ (created after pod install)
│   ├── Podfile
│   └── public/ (web assets synced here)
└── .gitignore
```

## What Gets Generated

### `AppDelegate.swift`
The main iOS application entry point that initializes Capacitor.

### `Info.plist`
iOS app configuration including:
- Bundle identifier
- App name
- Required permissions
- Supported orientations
- Status bar configuration

### `Assets.xcassets/`
Contains app icons and other image assets.

### `Podfile`
CocoaPods dependency file for iOS native dependencies.

### `App.xcodeproj/`
The Xcode project file. Open this to build and run the app.

## First Time Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Initialize iOS project (only once)
npm run ios:init

# 4. Navigate to iOS app directory and install pods
cd ios/App
pod install
cd ../..

# 5. Sync web assets to iOS
npm run ios:sync

# 6. Open in Xcode
npm run ios:open
```

## Subsequent Builds

After the initial setup, you only need:

```bash
# Build web app and sync to iOS
npm run ios:build

# Open in Xcode
npm run ios:open
```

## Note

The `ios/` directory is included in `.gitignore` for generated files like:
- `ios/App/Pods/` - CocoaPods dependencies
- `ios/App/*.xcworkspace` - Xcode workspace
- Build artifacts

However, the core iOS project structure (App.xcodeproj, Info.plist, etc.) should be committed to version control.
