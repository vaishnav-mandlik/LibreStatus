<div align="center">

<img src="android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png" width="96" alt="LibreStatus icon" />

# LibreStatus

**View, save and share WhatsApp statuses, fully offline.**

No account, no ads, no trackers, no internet permission. Everything happens on your phone.

[![F-Droid](https://img.shields.io/f-droid/v/com.vaishnavmandlik.librestatus?logo=fdroid&label=F-Droid&color=1976D2)](https://f-droid.org/packages/com.vaishnavmandlik.librestatus/)
[![GitHub release](https://img.shields.io/github/v/release/vaishnav-mandlik/LibreStatus?logo=github&label=APK&color=00A884)](https://github.com/vaishnav-mandlik/LibreStatus/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/vaishnav-mandlik/LibreStatus/total?color=00A884)](https://github.com/vaishnav-mandlik/LibreStatus/releases)
[![License: MIT](https://img.shields.io/github/license/vaishnav-mandlik/LibreStatus?color=6F6F6F)](LICENSE)

</div>

---

## Download

<div align="center">

<a href="https://f-droid.org/packages/com.vaishnavmandlik.librestatus/">
  <img src="https://fdroid.gitlab.io/artwork/badge/get-it-on.png" alt="Get it on F-Droid" height="70" />
</a>
<a href="https://github.com/vaishnav-mandlik/LibreStatus/releases/latest">
  <img src="https://raw.githubusercontent.com/andOTP/andOTP/master/assets/badges/get-it-on-github.png" alt="Get it on GitHub" height="70" />
</a>

</div>

- **F-Droid:** [f-droid.org/packages/com.vaishnavmandlik.librestatus](https://f-droid.org/packages/com.vaishnavmandlik.librestatus/)
- **Direct APK:** [LibreStatus-1.0.1.apk](https://github.com/vaishnav-mandlik/LibreStatus/releases/download/1.0.1/LibreStatus-1.0.1.apk) (latest on the [releases page](https://github.com/vaishnav-mandlik/LibreStatus/releases/latest))

> WhatsApp statuses disappear after 24 hours. LibreStatus reads the statuses that
> are already cached on your device after you view them, and lets you keep the ones
> you like.

## Screenshots

<div align="center">

| Statuses | Saved | Full-screen viewer | Settings |
| :---: | :---: | :---: | :---: |
| <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/1.jpeg" width="200" alt="Status grid" /> | <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/2.jpeg" width="200" alt="Saved tab" /> | <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/3.jpeg" width="200" alt="Full-screen viewer" /> | <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/4.jpeg" width="200" alt="Settings" /> |

</div>

## Features

- Browse the image and video statuses currently on your device
- Separate Images and Videos tabs, swipe to switch between them
- Full-screen viewer with video playback and a seek bar
- Save a status to your gallery with one tap
- Share or repost a status to WhatsApp (or any other app)
- A "Saved" tab for everything you've downloaded
- Message a number on WhatsApp without saving it as a contact
- Light, dark, and system themes
- 8 languages: English, Spanish, Portuguese, Russian, French, German, Italian,
  Dutch

## How it works

1. Open WhatsApp and view someone's status.
2. Open LibreStatus.
3. On Android 11 and newer, grant access to the WhatsApp media folder once
   through the system folder picker. On older versions, grant storage access.
4. Tap a status to view it full-screen, then tap download to save it.

The app never uploads anything. The status files it reads are the ones WhatsApp
itself has already stored on your device.

## Privacy

LibreStatus is built to need as little as possible:

- No `INTERNET` permission, so the app cannot send your data anywhere.
- No analytics, no advertising IDs, no crash reporting.
- No `MANAGE_EXTERNAL_STORAGE` ("All files access"). On Android 11+ it uses the
  Storage Access Framework so you choose exactly which folder it can read.

The full privacy policy and terms are available inside the app, under
**Settings → About**.

## Building from source

Requirements: Node 20+, JDK 17, the Android SDK, and an Android device or
emulator.

```sh
# install JS dependencies
npm install

# run on a connected device / emulator (starts Metro automatically)
npm run android

# build a release APK
npm run build:android:release
# output: android/app/build/outputs/apk/release/
```

Run the checks:

```sh
npm test          # unit tests
npm run lint      # eslint
npx tsc --noEmit  # type check
```

## Tech

React Native (0.82, new architecture + Hermes), TypeScript. Status folder access
on Android 11+ is handled by a small native module using the Storage Access
Framework.

## Contributing

Issues and pull requests are welcome. Please keep changes focused and run the
checks above before opening a PR.

## License

[MIT](LICENSE) © Vaishnav Mandlik

## Disclaimer

LibreStatus is an independent, third-party app. It is not affiliated with,
endorsed by, or connected to WhatsApp or Meta. WhatsApp is a trademark of its
respective owner. Please respect other people's privacy and content rights when
saving and sharing statuses.
</content>
</invoke>
