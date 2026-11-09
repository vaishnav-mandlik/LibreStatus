import { NativeModules } from 'react-native';

/**
 * Single source of truth for the app's identity.
 *
 * The values come from Android's generated `BuildConfig`, which is fed by
 * `android/app/build.gradle`. Nothing else in the JS tree should hardcode a
 * version — that is how the old build ended up with the number written out in
 * twelve places, one of which had already gone stale.
 *
 * The fallbacks only apply where the native module is absent: iOS, and Jest.
 */
interface BuildConstants {
  versionName?: string;
  versionCode?: number;
  applicationId?: string;
}

const constants: BuildConstants =
  (NativeModules as { FolderPicker?: BuildConstants }).FolderPicker ?? {};

export const APP_VERSION: string = constants.versionName ?? '1.1.0';

export const APP_VERSION_CODE: number = constants.versionCode ?? 0;

export const APP_ID: string =
  constants.applicationId ?? 'com.mandlik.statussaverpro';

/** Where Send feedback goes. The only contact detail the app carries. */
export const SUPPORT_EMAIL = 'vaishnavmandlik51@duck.com';

/**
 * The product name as one string, for the places that need it outside a
 * translated sentence: the share message, the feedback footer, the version
 * line. Screens set the wordmark from the `brand.name` key instead.
 */
export const BRAND_FULL = 'Status Saver';
