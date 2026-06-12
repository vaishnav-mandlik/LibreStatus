import { Platform, PermissionsAndroid, Linking } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { showFeedback } from '../context/FeedbackContext';

/**
 * Storage permission strategy (Android only):
 *
 *  - Android 13+ (API 33+): scoped media read permissions (images/videos). These
 *    back the gallery used by the "Saved" tab.
 *  - Android 11-12 (API 30-32): access to WhatsApp's .Statuses folder is granted
 *    through the Storage Access Framework folder picker (see folderPicker.ts), so
 *    there is no broad runtime permission to request here.
 *  - Android 6-10 (API 23-29): legacy READ_EXTERNAL_STORAGE to read the folder
 *    directly.
 *
 * MANAGE_EXTERNAL_STORAGE ("All files access") is intentionally never requested.
 */

export const checkStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidVersion = Platform.Version;

    if (androidVersion >= 33) {
      // Android 13+ - media read permissions
      const imageCheck = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      );
      const videoCheck = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      );
      return imageCheck && videoCheck;
    }

    if (androidVersion >= 30) {
      // Android 11-12 - handled by the SAF folder picker, nothing to check here.
      return true;
    }

    // Android 6-10 - legacy storage permission
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
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
      // Android 13+ - request media read permissions
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
    }

    if (androidVersion >= 30) {
      // Android 11-12 - access is granted through the SAF folder picker, which is
      // driven from the status list screen. Nothing to request here.
      return true;
    }

    if (androidVersion >= 23) {
      // Android 6-10 - request legacy storage permission
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
      }

      if (readResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        showSettingsAlert();
      }

      return false;
    }

    // Android 5 and below - permissions granted at install time
    return true;
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
