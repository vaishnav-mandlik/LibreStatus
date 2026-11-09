import { Linking, Platform } from 'react-native';
import { APP_ID, APP_VERSION, BRAND_FULL, SUPPORT_EMAIL } from '../appInfo';

/**
 * The two links that leave the app.
 *
 * Neither needs the internet permission the app deliberately does not hold:
 * both hand a URL to Android, which gives it to whichever app claims it. If
 * nothing does, the call resolves false and the caller says so rather than
 * leaving the tap looking ignored.
 */

/**
 * The application id the F-Droid flavor is built under. The Play flavor uses
 * a different one; see productFlavors in android/app/build.gradle.
 */
export const FDROID_APP_ID = 'com.vaishnavmandlik.librestatus';

/**
 * The store listing, preferred through the store app rather than a browser.
 * `market://` is claimed by both the Play Store and the F-Droid client, so the
 * deep link is the same for both builds; only the web fallback differs.
 */
export const STORE_DEEP_LINK = `market://details?id=${APP_ID}`;
export const STORE_WEB_URL =
  APP_ID === FDROID_APP_ID
    ? `https://f-droid.org/packages/${APP_ID}/`
    : `https://play.google.com/store/apps/details?id=${APP_ID}`;

const open = async (url: string): Promise<boolean> => {
  try {
    // `canOpenURL` answers false for a scheme no installed app claims, which
    // for `market://` means the Play Store is not on this device — a Huawei or
    // a de-Googled phone, where the web URL is the one that resolves.
    if (!(await Linking.canOpenURL(url))) {
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};

/** Opens the store listing. Falls back to the browser, then gives up. */
export const openStoreListing = async (): Promise<boolean> =>
  (await open(STORE_DEEP_LINK)) || open(STORE_WEB_URL);

/**
 * The text a feedback report carries.
 *
 * The version and the Android release are on it because they are the first two
 * things any bug report needs and the last two anyone thinks to include.
 */
export const feedbackReport = (subject: string): string =>
  `${subject}\n\n---\n${BRAND_FULL} ${APP_VERSION}\nAndroid ${String(
    Platform.Version,
  )}`;

/** A mail to the support address, subject and report filled in. */
export const feedbackMailUrl = (subject: string): string =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(feedbackReport(subject))}`;

/**
 * Opens the mail client on a message to the support address. Resolves false
 * when no app on the device handles `mailto:`, so the caller can fall back to
 * the share sheet rather than leave the row looking dead.
 */
export const openFeedbackMail = async (subject: string): Promise<boolean> =>
  open(feedbackMailUrl(subject));
