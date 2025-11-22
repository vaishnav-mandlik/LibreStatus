# Quick Start Guide - WhatsApp Status Downloader

## 🚀 Running the App

### Prerequisites

- Node.js 20+ installed
- Android Studio with Android SDK (for Android development)
- An Android device or emulator
- WhatsApp installed on the test device

### Step-by-Step Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Metro Bundler**

   ```bash
   npm start
   ```

3. **Run on Android** (in a new terminal)

   ```bash
   npm run android
   ```

   Or manually:

   ```bash
   cd android
   ./gradlew installDebug
   ```

## 📱 Testing the App

1. **On Your Test Device:**

   - Make sure WhatsApp is installed
   - View some statuses in WhatsApp first
   - Open the WhatsApp Status Downloader app
   - Grant storage permissions when prompted

2. **Expected Behavior:**
   - App shows a permission screen initially
   - After granting permissions, you'll see a grid of status thumbnails
   - Tap any status to view it full-screen
   - Tap the download button to save to gallery
   - Swipe down to refresh the list

## 🎨 UI Features

- **Gradient Header**: Purple to blue gradient at the top
- **Status Cards**: Grid layout with 2 columns
- **Video Indicator**: Play icon on video statuses
- **Download Button**: Circular button with download icon
- **Saved Badge**: Green checkmark for saved statuses
- **Full-Screen Viewer**: Tap to view status in full screen
- **Tab Navigation**: Switch between WhatsApp, Business, and About

## 🔧 Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clean the build
cd android
./gradlew clean
cd ..

# Clear Metro cache
npm start -- --reset-cache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Permission Issues

On Android 11+, if you can't access statuses:

1. Go to device Settings
2. Apps → WhatsApp Status Downloader
3. Permissions → Files and Media
4. Select "Allow"

### No Statuses Showing

1. Open WhatsApp and view someone's status
2. Close WhatsApp
3. Open Status Downloader
4. Pull down to refresh

## 📝 Development Notes

### Key Files

- `App.tsx` - Main navigation setup
- `src/screens/StatusListScreen.tsx` - Status grid and logic
- `src/components/StatusCard.tsx` - Status card component
- `src/components/StatusViewer.tsx` - Full-screen viewer
- `src/utils/statusManager.ts` - File system operations
- `src/utils/permissions.ts` - Permission handling

### Modifying the UI

**Change Colors:**
Edit the gradient colors in components:

```typescript
colors={['#667eea', '#764ba2']}  // Change these hex values
```

**Change Grid Layout:**
In `StatusListScreen.tsx`:

```typescript
numColumns={2}  // Change to 3 for 3-column grid
```

**Add Features:**

- Add filters (images only, videos only)
- Add search functionality
- Add bulk download
- Add favorites/bookmarks

## 🏗️ Building for Release

### Generate Release APK

1. **Update version in `android/app/build.gradle`:**

   ```gradle
   versionCode 2
   versionName "1.1"
   ```

2. **Build:**

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Find APK:**
   `android/app/build/outputs/apk/release/app-release.apk`

### Generate Signed APK (Production)

1. **Generate signing key:**

   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Update `android/app/build.gradle`:**

   ```gradle
   signingConfigs {
       release {
           storeFile file('my-release-key.keystore')
           storePassword 'your-password'
           keyAlias 'my-key-alias'
           keyPassword 'your-password'
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           minifyEnabled true
           proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
       }
   }
   ```

3. **Build signed APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## 📦 App Size Optimization

Current APK size: ~50-70 MB (includes React Native runtime)

To reduce size:

1. Enable ProGuard (minifyEnabled true)
2. Use APK splits by ABI
3. Remove unused resources

## 🐛 Common Issues

**Issue**: App crashes on launch

- **Solution**: Check logcat for errors: `adb logcat | grep ReactNative`

**Issue**: Cannot read statuses

- **Solution**: Ensure correct WhatsApp path for your device

**Issue**: Videos not playing

- **Solution**: Check video codec support on device

## 📱 Testing Checklist

- [ ] App installs successfully
- [ ] Permissions are requested and granted
- [ ] WhatsApp statuses are visible
- [ ] Business statuses are visible (if WhatsApp Business installed)
- [ ] Tap to view status in full screen
- [ ] Download saves to gallery
- [ ] Saved badge appears after download
- [ ] Video playback works
- [ ] Share functionality works
- [ ] Pull to refresh updates list
- [ ] Tab navigation works
- [ ] About screen displays correctly

## 🎯 Next Steps

Enhance the app with:

- [ ] Dark mode support
- [ ] Multiple language support
- [ ] Status scheduling/reminders
- [ ] Improved video player controls
- [ ] Batch download feature
- [ ] Search and filter options
- [ ] Status analytics

---

Happy coding! 🚀
