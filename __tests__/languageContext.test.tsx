/**
 * @format
 *
 * The language the app boots in. The dictionary itself is covered by
 * i18n.test.ts; this is the resolution order around it.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';
import { LanguageProvider, useLanguage } from '../src/context/LanguageContext';
import type { LanguageCode } from '../src/i18n';

const bestTag = RNLocalize.findBestLanguageTag as jest.Mock;

let language: LanguageCode;

const Probe: React.FC = () => {
  language = useLanguage().language;
  return null;
};

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

const boot = async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
  });
  mounted.push(tree);
};

afterEach(async () => {
  for (const tree of mounted.splice(0)) {
    await act(async () => {
      tree.unmount();
    });
  }
  jest.restoreAllMocks();
  bestTag.mockReturnValue({ languageTag: 'en-US', isRTL: false });
  await AsyncStorage.clear();
});

describe('LanguageProvider', () => {
  it('takes the stored preference over the device locale', async () => {
    await AsyncStorage.setItem('app_language', 'it');
    bestTag.mockReturnValue({ languageTag: 'de-DE', isRTL: false });
    await boot();
    expect(language).toBe('it');
  });

  it('falls back to the device locale on a first run', async () => {
    bestTag.mockReturnValue({ languageTag: 'de-DE', isRTL: false });
    await boot();
    expect(language).toBe('de');
  });

  it('still uses the device locale when the preference cannot be written', async () => {
    // A full or locked store must not silently demote a German phone to
    // English: the write is a convenience, the detection is the answer.
    bestTag.mockReturnValue({ languageTag: 'de-DE', isRTL: false });
    jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValue(new Error('no space left on device'));
    await boot();
    expect(language).toBe('de');
  });
});
