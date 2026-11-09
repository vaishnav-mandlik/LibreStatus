/**
 * @format
 *
 * The two links that leave the app. Neither may need the internet permission
 * the app does not hold: both hand a URL to Android and let it decide.
 */

import { Linking } from 'react-native';
import {
  STORE_DEEP_LINK,
  STORE_WEB_URL,
  feedbackMailUrl,
  feedbackReport,
  openStoreListing,
} from '../src/utils/outbound';
import { APP_ID, APP_VERSION, BRAND_FULL, SUPPORT_EMAIL } from '../src/appInfo';
import { asMock } from '../test-support/testUtils';

/*
 * Both spies are rebuilt AND cleared per test. Restoring them in an afterEach
 * was not enough on its own: the call history carried into the next test, and
 * "opened the browser, not the store" passed on a `market://` call the
 * previous test had made.
 */
beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  asMock(Linking.canOpenURL).mockClear();
  asMock(Linking.openURL).mockClear();
});

test('the store links name this app, not a placeholder', () => {
  expect(STORE_DEEP_LINK).toContain(APP_ID);
  expect(STORE_WEB_URL).toContain(APP_ID);
});

test('each store build links to its own store', () => {
  const linksFor = (applicationId: string) => {
    let links: { deep: string; web: string } | undefined;
    jest.isolateModules(() => {
      const { NativeModules } = require('react-native');
      const saved = NativeModules.FolderPicker;
      NativeModules.FolderPicker = { ...saved, applicationId };
      try {
        const outbound = require('../src/utils/outbound');
        links = { deep: outbound.STORE_DEEP_LINK, web: outbound.STORE_WEB_URL };
      } finally {
        NativeModules.FolderPicker = saved;
      }
    });
    return links!;
  };

  expect(linksFor('com.vaishnavmandlik.librestatus')).toEqual({
    deep: 'market://details?id=com.vaishnavmandlik.librestatus',
    web: 'https://f-droid.org/packages/com.vaishnavmandlik.librestatus/',
  });
  expect(linksFor('com.mandlik.statussaverpro')).toEqual({
    deep: 'market://details?id=com.mandlik.statussaverpro',
    web: 'https://play.google.com/store/apps/details?id=com.mandlik.statussaverpro',
  });
});

test('prefers the Play app over the browser', async () => {
  await expect(openStoreListing()).resolves.toBe(true);

  expect(asMock(Linking.openURL)).toHaveBeenCalledWith(STORE_DEEP_LINK);
  expect(asMock(Linking.openURL)).toHaveBeenCalledTimes(1);
});

/*
 * `market://` resolves to nothing on a phone with no Play Store — a Huawei, or
 * a de-Googled one. The listing is still reachable over the web there.
 */
test('falls back to the browser where Play is not installed', async () => {
  asMock(Linking.canOpenURL).mockImplementation(async (url: string) =>
    !url.startsWith('market:'),
  );

  await expect(openStoreListing()).resolves.toBe(true);

  expect(asMock(Linking.openURL)).toHaveBeenCalledWith(STORE_WEB_URL);
  expect(asMock(Linking.openURL)).not.toHaveBeenCalledWith(STORE_DEEP_LINK);
});

test('reports failure rather than throwing when nothing can open it', async () => {
  asMock(Linking.canOpenURL).mockResolvedValue(false);

  await expect(openStoreListing()).resolves.toBe(false);
  expect(asMock(Linking.openURL)).not.toHaveBeenCalled();
});

/* A rejected openURL is a dead end, not an unhandled rejection. */
test('survives an openURL that throws', async () => {
  asMock(Linking.openURL).mockRejectedValue(new Error('no activity'));

  await expect(openStoreListing()).resolves.toBe(false);
});

test('the feedback report carries the version and the platform', () => {
  const report = feedbackReport('Feedback');

  expect(report).toContain('Feedback');
  expect(report).toContain(`${BRAND_FULL} ${APP_VERSION}`);
  expect(report).toContain('Android');
});

test('feedback mail goes to the support address with the report as its body', () => {
  const url = feedbackMailUrl('Hello');

  expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
  expect(decodeURIComponent(url)).toContain('subject=Hello');
  expect(decodeURIComponent(url)).toContain(`${BRAND_FULL} ${APP_VERSION}`);
});
