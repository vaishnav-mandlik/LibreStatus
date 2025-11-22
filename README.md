# WhatsApp Status Downloader

A beautiful and fully-functional WhatsApp Status Downloader for Android built with React Native.

## Features ✨

- 📥 **Download Status** - Save images and videos from WhatsApp and WhatsApp Business statuses
- 🎨 **Beautiful UI** - Modern gradient design with smooth animations
- 📱 **Dual Support** - Works with both WhatsApp and WhatsApp Business
- 🎬 **Video Support** - Built-in video player with playback controls
- 🔄 **Pull to Refresh** - Easy refresh to see new statuses
- 💾 **Gallery Integration** - Saved statuses are directly saved to your device gallery
- 📤 **Share Feature** - Share statuses with friends
- 🔒 **Privacy Focused** - All operations are local, no data uploaded to servers

## Screenshots

The app features:

- A modern gradient header with purple/blue theme
- Grid layout displaying status thumbnails
- Video indicators for video statuses
- Download buttons on each status card
- Full-screen viewer for images and videos
- Tab navigation between WhatsApp, WhatsApp Business, and About screens

## Requirements

- React Native 0.82.1
- Android 7.0 (API 24) or higher
- Node.js 20+
- WhatsApp installed on device

## Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run on Android**
   ```bash
   npm run android
   ```

## How to Use

1. **Grant Permissions**: On first launch, the app will request storage permissions. Grant them to access statuses.

2. **View Statuses**: Open WhatsApp and view someone's status first. Then open this app to see available statuses.

3. **Download**:

   - Tap any status to view it in full screen
   - Tap the download button (⬇) to save to gallery
   - Saved statuses are marked with a green checkmark

4. **Switch Apps**: Use the bottom tabs to switch between WhatsApp and WhatsApp Business statuses.

## How It Works

The app scans the following directories for WhatsApp statuses:

**WhatsApp:**

- `/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses`
- `/storage/emulated/0/WhatsApp/Media/.Statuses`

**WhatsApp Business:**

- `/storage/emulated/0/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses`
- `/storage/emulated/0/WhatsApp Business/Media/.Statuses`

## Permissions Required

- `READ_EXTERNAL_STORAGE` - To read WhatsApp status files (Android 10-12)
- `WRITE_EXTERNAL_STORAGE` - To save statuses to gallery (Android 9 and below)
- `READ_MEDIA_IMAGES` - To read image statuses (Android 13+)
- `READ_MEDIA_VIDEO` - To read video statuses (Android 13+)

## Tech Stack

- **React Native 0.82.1** - Cross-platform framework
- **TypeScript** - Type-safe development
- **React Navigation** - Navigation and routing
- **react-native-fs** - File system operations
- **react-native-permissions** - Permission handling
- **react-native-linear-gradient** - Beautiful gradient effects
- **react-native-video** - Video playback
- **@react-native-camera-roll/camera-roll** - Gallery integration

## Project Structure

```
whatsappstatus/
├── src/
│   ├── components/
│   │   ├── StatusCard.tsx        # Status thumbnail card
│   │   ├── StatusViewer.tsx      # Full-screen status viewer
│   │   └── EmptyState.tsx        # Empty state component
│   ├── screens/
│   │   ├── StatusListScreen.tsx  # Main status list screen
│   │   └── AboutScreen.tsx       # About/Help screen
│   ├── utils/
│   │   ├── permissions.ts        # Permission handling
│   │   └── statusManager.ts      # Status file operations
│   └── types/
│       └── index.ts              # TypeScript types
└── App.tsx                       # Main app component
```

## Troubleshooting

### No statuses showing

1. Make sure WhatsApp is installed
2. View someone's status in WhatsApp first
3. Grant all requested permissions
4. Pull down to refresh the list

### Permission denied

Go to Settings → Apps → WhatsApp Status Downloader → Permissions and enable Storage permissions.

### Saved status not in gallery

Check your gallery app's "Download" or "WhatsApp Status" folder.

## Building for Release

```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Privacy

This app:

- ✅ Operates entirely locally on your device
- ✅ Does not collect any personal data
- ✅ Does not upload any data to external servers

## Legal Disclaimer

This app is not affiliated with WhatsApp Inc. Users are responsible for respecting others' privacy when downloading statuses.

---

Made with ❤️ for WhatsApp users

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
