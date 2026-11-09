/* eslint-env jest */

// AsyncStorage – official mock
jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);


// react-native-fs – promise-based stub covering everything the app calls.
jest.mock('react-native-fs', () => ({
  ExternalStorageDirectoryPath: '/storage/emulated/0',
  CachesDirectoryPath: '/data/cache',
  DocumentDirectoryPath: '/data/documents',
  exists: jest.fn().mockResolvedValue(false),
  readDir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({ size: 0 }),
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined),
  moveFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Camera roll
jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    save: jest.fn().mockResolvedValue('saved'),
    getPhotos: jest.fn().mockResolvedValue({ edges: [] }),
    deletePhotos: jest.fn().mockResolvedValue(undefined),
  },
}));

// react-native-share: only the system sheet (`open`) is used. The WhatsApp
// handoff goes through the FolderPicker native module above.
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue({}),
  },
}));

// react-native-video – render a no-op component
jest.mock('react-native-video', () => ({
  __esModule: true,
  default: 'Video',
  ViewType: { TEXTURE: 0, SURFACE: 1, SURFACE_SECURE: 2 },
}));

// react-native-svg – the app's own <Icon> draws with these. Plain string
// components keep a rendered tree serialisable without the native renderer.
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Path: 'Path',
  Circle: 'Circle',
  Rect: 'Rect',
  G: 'G',
  Line: 'Line',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Stop: 'Stop',
}));

// Linear gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Safe areas – official mock (zero insets, a pass-through SafeAreaView).
// The mock file has a DEFAULT export, so it has to be unwrapped: handing the
// module object to jest.mock leaves every named import (SafeAreaProvider,
// useSafeAreaInsets) undefined and the first render dies on it.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Localize – must include findBestLanguageTag and uses24HourClock, which the
// language context and the time formatter call. Leaving them out makes those
// code paths fall into their catch blocks and silently test nothing.
jest.mock('react-native-localize', () => ({
  getCountry: jest.fn().mockReturnValue('US'),
  uses24HourClock: jest.fn().mockReturnValue(false),
  findBestLanguageTag: jest
    .fn()
    .mockReturnValue({ languageTag: 'en-US', isRTL: false }),
  getLocales: jest.fn().mockReturnValue([
    {
      countryCode: 'US',
      languageTag: 'en-US',
      languageCode: 'en',
      isRTL: false,
    },
  ]),
}));

// The app's native module. Real methods exist only on a device; the JS wrapper
// treats every one as optional, so we provide the constants the version string
// reads plus no-op implementations for the rest.
//
// This assigns onto the NativeModules object rather than jest.mock-ing the
// module: requireActual on NativeModules boots the batched bridge and throws
// "__fbBatchedBridgeConfig is not set".
const { NativeModules } = require('react-native');

NativeModules.FolderPicker = {
  versionName: '2.0.0',
  versionCode: 200,
  applicationId: 'com.mandlik.statussaverpro',
  pickFolder: jest.fn().mockResolvedValue(null),
  listFiles: jest.fn().mockResolvedValue([]),
  copyDocument: jest.fn().mockResolvedValue(0),
  setSecureFlag: jest.fn().mockResolvedValue(true),
  setKeepAwake: jest.fn().mockResolvedValue(true),
  getVideoThumbnail: jest.fn().mockResolvedValue(null),
  getVideoMeta: jest.fn().mockResolvedValue(null),
  clearThumbnailCache: jest.fn().mockResolvedValue(0),
  trimThumbnailCache: jest.fn().mockResolvedValue(0),
  openFolder: jest.fn().mockResolvedValue(true),
  shareFileTo: jest.fn().mockResolvedValue(true),
  isPackageInstalled: jest.fn().mockResolvedValue(true),
  openApp: jest.fn().mockResolvedValue(true),
  setSystemBars: jest.fn().mockResolvedValue(true),
};
