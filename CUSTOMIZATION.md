# App Configuration & Customization Guide

## 🎨 Customization Options

### Change App Name

**1. Update package.json:**

```json
{
  "name": "your-app-name",
  "displayName": "Your App Name"
}
```

**2. Update Android strings:**
`android/app/src/main/res/values/strings.xml`

```xml
<string name="app_name">Your App Name</string>
```

### Change App Icon

Replace these files with your icon:

- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

### Change Theme Colors

**Edit App.tsx and component files:**

```typescript
// Replace these gradient colors throughout the app
colors={['#667eea', '#764ba2']}  // Current purple-blue gradient

// Example alternatives:
colors={['#f093fb', '#f5576c']}  // Pink-red
colors={['#4facfe', '#00f2fe']}  // Light blue-cyan
colors={['#43e97b', '#38f9d7']}  // Green-cyan
colors={['#fa709a', '#fee140']}  // Pink-yellow
```

### Change App Package Name

**1. Update android/app/build.gradle:**

```gradle
defaultConfig {
    applicationId "com.yourcompany.statusdownloader"
}
```

**2. Rename package directories:**

```bash
android/app/src/main/java/com/whatsappstatus/
# to
android/app/src/main/java/com/yourcompany/statusdownloader/
```

**3. Update package declarations in Java/Kotlin files**

## ⚙️ Build Configuration

### Change Version

`android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 1        // Increment for each release
    versionName "1.0.0"  // Semantic version
}
```

### Enable ProGuard (Reduce APK Size)

`android/app/build.gradle`:

```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

### Split APK by Architecture (Reduce APK Size)

`android/app/build.gradle`:

```gradle
android {
    splits {
        abi {
            reset()
            enable true
            universalApk false
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }
}
```

This creates separate APKs:

- arm64-v8a: Modern 64-bit devices (~30MB)
- armeabi-v7a: Older 32-bit devices (~28MB)
- x86_64: 64-bit emulators
- x86: 32-bit emulators

## 🔧 Feature Customization

### Change Grid Columns

`src/screens/StatusListScreen.tsx`:

```typescript
<FlatList
  numColumns={3} // Change from 2 to 3 columns
/>
```

### Add Dark Mode

Create a theme context and use it throughout:

```typescript
// src/contexts/ThemeContext.tsx
import React, { createContext, useState, useContext } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

Then use in components:

```typescript
const { theme } = useTheme();
const backgroundColor = theme === 'light' ? '#f8f9fa' : '#1a1a1a';
```

### Add More Status Sources

Edit `src/utils/statusManager.ts`:

```typescript
const ADDITIONAL_PATHS = [
  '/storage/emulated/0/GBWhatsApp/Media/.Statuses',
  '/storage/emulated/0/WhatsApp Plus/Media/.Statuses',
];
```

### Add Status Filters

Add filter state and buttons:

```typescript
const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('all');

const filteredStatuses = statuses.filter(status => {
  if (filter === 'images') return status.type === 'image';
  if (filter === 'videos') return status.type === 'video';
  return true;
});
```

## 📊 Analytics Integration

### Add Firebase Analytics (Optional)

```bash
npm install @react-native-firebase/app @react-native-firebase/analytics
```

Then track events:

```typescript
import analytics from '@react-native-firebase/analytics';

// Track status download
await analytics().logEvent('status_downloaded', {
  type: status.type,
  timestamp: Date.now(),
});
```

## 🔐 Security Enhancements

### Add Fingerprint/Face ID

```bash
npm install react-native-biometrics
```

```typescript
import ReactNativeBiometrics from 'react-native-biometrics';

const authenticateUser = async () => {
  const { success } = await ReactNativeBiometrics.simplePrompt({
    promptMessage: 'Authenticate to view statuses',
  });
  return success;
};
```

### Add Password Protection

Store encrypted preferences:

```bash
npm install @react-native-encrypted-storage/encrypted-storage
```

## 🌍 Internationalization (i18n)

```bash
npm install i18next react-i18next
```

Create translation files:

```typescript
// src/i18n/en.json
{
  "home": {
    "title": "WhatsApp Status",
    "noStatuses": "No statuses found",
    "download": "Download"
  }
}
```

Use in components:

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<Text>{t('home.title')}</Text>;
```

## 📱 Additional Features to Add

### 1. Search Functionality

```typescript
const [searchQuery, setSearchQuery] = useState('');
const filteredStatuses = statuses.filter(status =>
  status.filename.toLowerCase().includes(searchQuery.toLowerCase()),
);
```

### 2. Sort Options

```typescript
const sortedStatuses = [...statuses].sort((a, b) => {
  if (sortBy === 'newest') return b.timestamp - a.timestamp;
  if (sortBy === 'oldest') return a.timestamp - b.timestamp;
  if (sortBy === 'size') return b.size - a.size;
  return 0;
});
```

### 3. Favorites/Bookmarks

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const [favorites, setFavorites] = useState<string[]>([]);

const toggleFavorite = async (statusId: string) => {
  const newFavorites = favorites.includes(statusId)
    ? favorites.filter(id => id !== statusId)
    : [...favorites, statusId];

  setFavorites(newFavorites);
  await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
};
```

### 4. Bulk Download

```typescript
const downloadAll = async () => {
  for (const status of statuses) {
    await saveStatusToGallery(status);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
  }
};
```

### 5. Status History

Keep track of viewed statuses:

```typescript
const [viewedStatuses, setViewedStatuses] = useState<Set<string>>(new Set());

const markAsViewed = (statusId: string) => {
  setViewedStatuses(prev => new Set([...prev, statusId]));
};
```

## 🎯 Performance Optimization

### Enable Hermes (Already enabled)

Hermes is a JavaScript engine optimized for React Native.

### Use React.memo for Components

```typescript
export default React.memo(StatusCard, (prevProps, nextProps) => {
  return (
    prevProps.status.id === nextProps.status.id &&
    prevProps.isSaving === nextProps.isSaving
  );
});
```

### Optimize Images

```typescript
<Image
  source={{ uri: status.uri }}
  style={styles.image}
  resizeMode="cover"
  fadeDuration={0}
  progressiveRenderingEnabled={true}
/>
```

### Use FlatList Optimization

```typescript
<FlatList
  data={statuses}
  renderItem={renderItem}
  keyExtractor={item => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={10}
/>
```

## 🐛 Debugging

### Enable Debug Logging

```typescript
// src/utils/logger.ts
const isDev = __DEV__;

export const log = {
  info: (message: string, data?: any) => {
    if (isDev) console.log('ℹ️', message, data);
  },
  error: (message: string, error?: any) => {
    if (isDev) console.error('❌', message, error);
  },
  warn: (message: string, data?: any) => {
    if (isDev) console.warn('⚠️', message, data);
  },
};
```

### Enable Flipper (React Native Debugger)

Already configured in the project. Launch Flipper app to debug.

## 📦 Deployment Checklist

Before releasing:

- [ ] Update version number
- [ ] Test on multiple Android versions (7-14)
- [ ] Test on different screen sizes
- [ ] Check all permissions work
- [ ] Test download functionality
- [ ] Verify video playback
- [ ] Test empty states
- [ ] Check error handling
- [ ] Generate signed APK
- [ ] Test signed APK on real device
- [ ] Create release notes
- [ ] Update README with version changes

## 🔄 Update Dependencies

Check for updates:

```bash
npm outdated
```

Update packages:

```bash
npm update
```

Update React Native:

```bash
npx react-native upgrade
```

## 📝 Environment Variables

Create `.env` file:

```env
APP_NAME=WhatsApp Status Downloader
API_URL=https://api.example.com
ENABLE_ANALYTICS=false
```

Install react-native-config:

```bash
npm install react-native-config
```

Use in app:

```typescript
import Config from 'react-native-config';
const appName = Config.APP_NAME;
```

---

## 🎉 You're All Set!

The app is fully customizable and ready for:

- ✅ Rebranding
- ✅ Feature additions
- ✅ Theme changes
- ✅ Performance optimization
- ✅ Deployment

For more help, check:

- React Native docs: https://reactnative.dev
- React Navigation: https://reactnavigation.org
- Android docs: https://developer.android.com

Happy coding! 🚀
