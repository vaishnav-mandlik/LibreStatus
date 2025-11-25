import { Platform, PermissionsAndroid, Linking } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import RNFS from 'react-native-fs';
import { showFeedback } from '../context/FeedbackContext';

export const checkStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidVersion = Platform.Version;

    if (androidVersion >= 33) {
      // Android 13+ - Check media permissions
      const imageCheck = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      );
      const videoCheck = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      );
      return imageCheck && videoCheck;
    } else if (androidVersion >= 30) {
      // Android 11-12 - Need MANAGE_EXTERNAL_STORAGE to access other apps
      // Check if we can read the WhatsApp directory
      try {
        const testPath = `${RNFS.ExternalStorageDirectoryPath}/Android/media/com.whatsapp`;
        const exists = await RNFS.exists(testPath);
        if (exists) {
          const files = await RNFS.readDir(testPath);
          return files.length >= 0; // If we can read, we have permission
        }
      } catch {
        return false;
      }
      return false;
    } else {
      // Android 10 and below - Check storage permission
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
      return hasPermission;
    }
  } catch {
    return false;
  }
};

export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidVersion = Platform.Version;

    // First check if we already have permission
    const hasPermission = await checkStoragePermission();
    if (hasPermission) {
      return true;
    }


    if (androidVersion >= 33) {
      // Android 13+ - Request media permissions

      const imageResult = await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
      const videoResult = await request(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);


      const granted =
        imageResult === RESULTS.GRANTED && videoResult === RESULTS.GRANTED;

      if (
        !granted &&
        (imageResult === RESULTS.BLOCKED || videoResult === RESULTS.BLOCKED)
      ) {
        showSettingsAlert();
      }

      return granted;
    } else if (androidVersion >= 30) {
      // Android 11-12 - Need special "All files access" permission

      showFeedback({
        title: 'Files Access Required',
        message:
          'To view WhatsApp statuses, grant "All files access" when prompted in Settings.',
        type: 'warning',
        actions: [
          {
            label: 'Not now',
            variant: 'secondary',
            onPress: () => {},
          },
          {
            label: 'Open Settings',
            onPress: () => {
              Linking.openSettings().catch(() => undefined);
            },
          },
        ],
      });

      return false;
    } else if (androidVersion >= 23) {
      // Android 6-10 - Request storage permissions

      const readResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message:
            'This app needs access to your storage to view WhatsApp statuses.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        },
      );

      if (readResult === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else if (readResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        showSettingsAlert();
        return false;
      } else {
        return false;
      }
    } else {
      // Android 5 and below - Permissions granted at install time
      return true;
    }
  } catch {
    return false;
  }
};

const showSettingsAlert = () => {
  showFeedback({
    title: 'Permission Required',
    message: 'Enable storage permissions in Settings to continue.',
    type: 'warning',
    actions: [
      {
        label: 'Cancel',
        variant: 'secondary',
        onPress: () => {},
      },
      {
        label: 'Open Settings',
        onPress: () => {
          Linking.openSettings().catch(() => undefined);
        },
      },
    ],
  });
};
