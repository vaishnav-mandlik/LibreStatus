/**
 * @format
 *
 * Tools' one outward action: handing a number to WhatsApp. The rest of the
 * screen is toggles the shell owns, so what is worth pinning here is the link
 * that gets built and the states in which no link should be opened at all.
 */

import React, { useState } from 'react';
import { Linking, Text, TextInput } from 'react-native';
import * as RNLocalize from 'react-native-localize';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
} from 'react-test-renderer';

import ToolsScreen from '../src/screens/ToolsScreen';
import { FeedbackProvider } from '../src/context/FeedbackContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { DEFAULT_PREFS, type Prefs } from '../src/utils/prefs';
import { en } from '../src/i18n/en';
import { asMock } from '../test-support/testUtils';

/** The shell owns prefs, so the harness plays that part. */
const Host: React.FC<{ dialCode: string }> = ({ dialCode }) => {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, dialCode });
  return (
    <ToolsScreen
      prefs={prefs}
      onPrefsChange={patch => setPrefs(prev => ({ ...prev, ...patch }))}
    />
  );
};

const mount = async (dialCode: string): Promise<ReactTestInstance> => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <LanguageProvider>
          <FeedbackProvider>
            <Host dialCode={dialCode} />
          </FeedbackProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );
  });
  await act(async () => {});
  trees.push(tree);
  return tree.root;
};

const trees: ReactTestRenderer.ReactTestRenderer[] = [];

/** Types into the subscriber field and taps "Open chat". */
const openChat = async (
  root: ReactTestInstance,
  digits: string,
): Promise<void> => {
  const field = root
    .findAllByType(TextInput)
    .find(
      node => node.props.accessibilityLabel === en['tools.phonePlaceholder'],
    );
  await act(async () => {
    field?.props.onChangeText(digits);
  });
  const button = root.find(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === en['tools.openChat'],
  );
  await act(async () => {
    button.props.onPress();
  });
  await act(async () => {});
};

const painted = (root: ReactTestInstance): string[] =>
  root.findAllByType(Text).flatMap(node => {
    const out: string[] = [];
    const walk = (child: unknown): void => {
      if (typeof child === 'string' || typeof child === 'number') {
        out.push(String(child));
      } else if (Array.isArray(child)) {
        child.forEach(walk);
      }
    };
    walk(node.props.children);
    return out.join('');
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

afterEach(() => {
  for (const tree of trees.splice(0)) {
    act(() => {
      tree.unmount();
    });
  }
  jest.restoreAllMocks();
});

describe('opening a chat', () => {
  it('drops the trunk prefix a national number is written with', async () => {
    /*
     * A UK number is written 07911 123456 and dialled internationally without
     * the leading 0. Pasting it in as typed built wa.me/4407911123456, which
     * WhatsApp rejects as "the phone number shared via url is invalid" with
     * nothing on our side to explain it.
     */
    const root = await mount('+44');
    await openChat(root, '07911123456');

    expect(Linking.openURL).toHaveBeenCalledWith(
      'whatsapp://send?phone=447911123456',
    );
  });

  it('keeps the leading zero for Italy, where the number carries it', async () => {
    const root = await mount('+39');
    await openChat(root, '0612345678');

    expect(Linking.openURL).toHaveBeenCalledWith(
      'whatsapp://send?phone=390612345678',
    );
  });

  it('leaves an ordinary number alone', async () => {
    const root = await mount('+1');
    await openChat(root, '5551234567');

    expect(Linking.openURL).toHaveBeenCalledWith(
      'whatsapp://send?phone=15551234567',
    );
  });

  it('opens nothing when the digits are all trunk prefix', async () => {
    const root = await mount('+44');
    await openChat(root, '000000');

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(painted(root)).toContain(en['toast.needDigits']);
  });

  it('asks for a country code before it opens anything', async () => {
    /*
     * An empty code is reachable two ways: the user clears the field, or the
     * device region is one the table does not carry. Neither may open a chat —
     * without a code, wa.me resolves the number against the recipient's own
     * country and opens a stranger's chat.
     */
    const root = await mount('+44');
    const dial = root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === en['tools.dialCode']);
    await act(async () => {
      dial?.props.onChangeText('');
    });
    await openChat(root, '7911123456');

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(painted(root)).toContain(en['toast.needDialCode']);
  });
});

describe('the country code the field starts with', () => {
  it('still renders when the device cannot say what country it is in', async () => {
    /*
     * `getCountry` is a native constant read, and every other call into this
     * library is wrapped because the module can be absent or the constant
     * unset. This one was not, and it runs inside the initial render — so a
     * throw took the whole Tools tab down rather than leaving the code field
     * empty, which is a state the screen already handles and explains.
     */
    asMock(RNLocalize.getCountry).mockImplementation(() => {
      throw new Error('no native module');
    });

    const root = await mount('');

    expect(painted(root)).toContain(en['tools.openChat']);
  });

  it('seeds the field from the device country when nothing is stored', async () => {
    asMock(RNLocalize.getCountry).mockReturnValue('IN');

    const root = await mount('');
    const dial = root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === en['tools.dialCode']);

    expect(dial?.props.value).toBe('+91');
  });
});

/*
 * A number pasted in international form carries its country code. Folded into
 * the subscriber digits it was dialled twice and opened a chat with nobody.
 */
describe('a pasted international number', () => {
  const phoneField = (root: ReactTestInstance): ReactTestInstance | undefined =>
    root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === en['tools.phonePlaceholder']);
  const dialField = (root: ReactTestInstance): ReactTestInstance | undefined =>
    root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === en['tools.dialCode']);

  it('drops the country code that is already in the country field', async () => {
    const root = await mount('+44');
    await act(async () => {
      phoneField(root)?.props.onChangeText('+44 7911 123456');
    });

    expect(phoneField(root)?.props.value).toBe('7911123456');
    expect(dialField(root)?.props.value).toBe('+44');
  });

  it('moves a different country code into the country field', async () => {
    const root = await mount('+91');
    await act(async () => {
      phoneField(root)?.props.onChangeText('+44 7911 123456');
    });
    await act(async () => {});

    expect(dialField(root)?.props.value).toBe('+44');
    expect(phoneField(root)?.props.value).toBe('7911123456');
  });

  it('reads 00 as the international prefix too', async () => {
    const root = await mount('+44');
    await act(async () => {
      phoneField(root)?.props.onChangeText('0044 7911 123456');
    });

    expect(phoneField(root)?.props.value).toBe('7911123456');
  });

  it('leaves a local number alone', async () => {
    const root = await mount('+44');
    await act(async () => {
      phoneField(root)?.props.onChangeText('07911 123456');
    });

    expect(phoneField(root)?.props.value).toBe('07911123456');
  });
});
