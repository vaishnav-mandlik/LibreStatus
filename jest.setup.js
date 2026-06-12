/* eslint-env jest */

// AsyncStorage – official mock
jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// react-native-permissions – official mock
jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);

// react-native-fs – simple promise-based stub
jest.mock('react-native-fs', () => ({
  ExternalStorageDirectoryPath: '/storage/emulated/0',
  CachesDirectoryPath: '/data/cache',
  exists: jest.fn().mockResolvedValue(false),
  readDir: jest.fn().mockResolvedValue([]),
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Camera roll
jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    save: jest.fn().mockResolvedValue('saved'),
    getPhotos: jest.fn().mockResolvedValue({ edges: [] }),
  },
}));

// react-native-share
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue({}),
    shareSingle: jest.fn().mockResolvedValue({}),
    Social: { WHATSAPP: 'whatsapp' },
  },
}));

// react-native-video – render a no-op component
jest.mock('react-native-video', () => 'Video');

// Vector icons – render a no-op component for each set
jest.mock('react-native-vector-icons/AntDesign', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Linear gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Localize
jest.mock('react-native-localize', () => ({
  getCountry: jest.fn().mockReturnValue('US'),
  getLocales: jest
    .fn()
    .mockReturnValue([
      {
        countryCode: 'US',
        languageTag: 'en-US',
        languageCode: 'en',
        isRTL: false,
      },
    ]),
}));

// The native FolderPicker module only exists on a real device. The app code
// already guards against it being undefined, so we leave it unmocked.
