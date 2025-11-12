# iOS Documentation Index

Quick reference guide to all iOS-related documentation and configuration files.

## 📚 Start Here

If you're new to iOS development with this app, follow this order:

### 1. **Quick Start** → [README.md](./README.md)
Start here for a brief overview of iOS support and quick start commands.

**What you'll learn:**
- iOS support overview
- Quick start commands
- Prerequisites check

**Time:** 2 minutes

---

### 2. **Complete Setup Guide** → [README_IOS.md](./README_IOS.md)
Comprehensive guide for iOS setup, development, and deployment.

**What you'll learn:**
- Detailed setup instructions
- Development workflow
- Testing on simulators and devices
- Troubleshooting common issues
- App Store submission process
- Safari Web Inspector usage
- iOS-specific features

**Time:** 15-20 minutes

---

### 3. **Directory Structure** → [IOS_SETUP.md](./IOS_SETUP.md)
Understand what gets generated and where files are located.

**What you'll learn:**
- iOS directory structure
- What each file/folder does
- First-time setup commands
- Subsequent build commands

**Time:** 5 minutes

---

### 4. **Verification Checklist** → [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md)
Step-by-step checklist to verify your iOS setup is working correctly.

**What you'll learn:**
- Configuration verification
- Build verification
- Testing checklist
- Common issues and solutions

**Time:** 10-15 minutes (during setup)

---

## 🔧 Configuration Files

### [capacitor.config.ts](./capacitor.config.ts)
Capacitor configuration file defining:
- App ID: `com.krittaphat6.bloombergthaidash`
- App Name: `Bloomberg Thai Dash`
- Web directory: `dist`
- iOS content inset settings

### [package.json](./package.json)
Contains Capacitor dependencies and iOS scripts:
- `npm run ios:init` - Initialize iOS project
- `npm run ios:sync` - Sync web assets
- `npm run ios:open` - Open Xcode
- `npm run ios:build` - Build + sync

### [vite.config.ts](./vite.config.ts)
Build configuration optimized for Capacitor:
- Output directory: `dist`
- Base path: `./` (relative)

### [.env.example](./.env.example)
Environment variables template for Supabase configuration.

---

## 📋 Quick Reference

### First Time Setup
```bash
npm install
npm run build
npm run ios:init
cd ios/App && pod install && cd ../..
npm run ios:sync
npm run ios:open
```

### Daily Development
```bash
# Make code changes, then:
npm run ios:build  # Build + sync
npm run ios:open   # Open Xcode (if not already open)
# Press Cmd+R in Xcode to rebuild
```

### Troubleshooting
- **Build issues?** → See README_IOS.md "Troubleshooting" section
- **White screen?** → Check VERIFICATION_CHECKLIST.md
- **CocoaPods errors?** → See README_IOS.md "Troubleshooting"

---

## 🎯 By Use Case

### "I want to test on iOS Simulator"
1. Read: README_IOS.md → "Testing in iOS Simulator"
2. Run: `npm run ios:build && npm run ios:open`
3. Select simulator in Xcode and press Cmd+R

### "I want to test on my iPhone"
1. Read: README_IOS.md → "Testing on Physical Device"
2. Configure signing in Xcode
3. Connect device and run

### "I want to publish to App Store"
1. Read: README_IOS.md → "App Store Submission"
2. Prepare release assets (icons, screenshots)
3. Archive and upload via Xcode

### "Something isn't working"
1. Check: VERIFICATION_CHECKLIST.md
2. Review: README_IOS.md → "Troubleshooting"
3. Check Safari Web Inspector for errors

### "I need to understand the iOS project structure"
1. Read: IOS_SETUP.md
2. Explore: `ios/App/` directory after running `ios:init`

---

## 📱 Platform-Specific Notes

### Safe Areas (Notch/Home Indicator)
- Handled automatically via CSS in `src/index.css`
- Uses `env(safe-area-inset-*)` variables
- Viewport configured with `viewport-fit=cover`

### Status Bar
- Style: `black-translucent`
- Configured in `index.html`
- Overlays content

### WebGL/3D Performance
- See README_IOS.md → "WebGL Support"
- Test on real devices for accurate performance
- Consider optimization for mobile

### Environment Variables
- Set in `.env` file (copy from `.env.example`)
- Embedded at build time
- Rebuild after changes: `npm run ios:build`

---

## 🆘 Getting Help

1. **Configuration Issues:** VERIFICATION_CHECKLIST.md
2. **Build/Runtime Errors:** README_IOS.md → Troubleshooting
3. **Directory/Structure Questions:** IOS_SETUP.md
4. **Capacitor Issues:** [Capacitor Docs](https://capacitorjs.com/docs)
5. **Xcode Issues:** [Apple Developer Forums](https://developer.apple.com/forums/)

---

## ✅ Prerequisites Checklist

Before starting, ensure you have:
- [ ] macOS (required for Xcode)
- [ ] Xcode 14+ installed
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] CocoaPods installed (`sudo gem install cocoapods`)
- [ ] Apple ID (for device testing/App Store)

---

## 🎓 Learning Path

**Beginner:** Start with README.md → README_IOS.md → First setup

**Intermediate:** Add VERIFICATION_CHECKLIST.md → Troubleshooting

**Advanced:** Explore Capacitor plugins → App Store submission

---

## 📄 File Summary

| File | Purpose | When to Use |
|------|---------|-------------|
| README.md | Quick overview | Getting started |
| README_IOS.md | Complete guide | Setup & development |
| IOS_SETUP.md | Structure guide | Understanding files |
| VERIFICATION_CHECKLIST.md | Testing guide | Verification |
| capacitor.config.ts | App config | Configuration |
| .env.example | Env template | Setup environment |

---

**Happy iOS Development! 🚀📱**
