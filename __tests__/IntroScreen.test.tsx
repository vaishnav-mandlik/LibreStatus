/**
 * @format
 *
 * The first-run intro: three slides, one way forward, two ways out. What
 * matters is that it finishes exactly once — the pref it writes is the only
 * thing standing between the user and seeing it again on every launch.
 */

import React from 'react';
import { BackHandler, Text } from 'react-native';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
} from 'react-test-renderer';

import IntroScreen, { SLIDE_COUNT } from '../src/screens/IntroScreen';
import { LanguageProvider } from '../src/context/LanguageContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { en } from '../src/i18n/en';

const trees: ReactTestRenderer.ReactTestRenderer[] = [];

/** Android's back listeners, newest first, the way the platform calls them. */
const backListeners: Array<() => boolean | null | undefined> = [];

const mount = async (
  onDone: () => void = () => undefined,
): Promise<ReactTestInstance> => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <LanguageProvider>
          <IntroScreen onDone={onDone} />
        </LanguageProvider>
      </ThemeProvider>,
    );
  });
  await act(async () => {});
  trees.push(tree);
  return tree.root;
};

const press = async (
  root: ReactTestInstance,
  label: string,
): Promise<void> => {
  const button = root.find(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
  await act(async () => {
    button.props.onPress();
  });
  await act(async () => {});
};

const back = async (): Promise<boolean> => {
  let handled = false;
  await act(async () => {
    for (let i = backListeners.length - 1; i >= 0; i -= 1) {
      if (backListeners[i]()) {
        handled = true;
        break;
      }
    }
  });
  return handled;
};

/** Every string the screen currently paints. */
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
    return out.length ? [out.join('')] : [];
  });

beforeEach(() => {
  backListeners.length = 0;
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      backListeners.push(handler);
      return {
        remove: () => {
          const at = backListeners.indexOf(handler);
          if (at >= 0) {
            backListeners.splice(at, 1);
          }
        },
      };
    });
});

afterEach(() => {
  for (const tree of trees.splice(0)) {
    act(() => {
      tree.unmount();
    });
  }
  jest.restoreAllMocks();
});

test('opens on the first slide, with all three mounted to swipe between', async () => {
  const root = await mount();
  const text = painted(root);

  expect(SLIDE_COUNT).toBe(3);
  expect(text).toContain(en['intro.one.title']);
  expect(text).toContain(en['intro.two.title']);
  expect(text).toContain(en['intro.three.title']);
  // The CTA reads "Next" until the last slide, which is where it commits.
  expect(text).toContain(en['intro.next']);
  expect(text).not.toContain(en['intro.start']);
});

test('walks to the end, where the CTA becomes the way in', async () => {
  const done = jest.fn();
  const root = await mount(done);

  await press(root, en['intro.next']);
  expect(done).not.toHaveBeenCalled();
  await press(root, en['intro.next']);
  expect(done).not.toHaveBeenCalled();

  expect(painted(root)).toContain(en['intro.start']);
  await press(root, en['intro.start']);
  expect(done).toHaveBeenCalledTimes(1);
});

test('Skip finishes it from the very first slide', async () => {
  const done = jest.fn();
  const root = await mount(done);

  await press(root, en['intro.skip']);

  expect(done).toHaveBeenCalledTimes(1);
});

/*
 * `onDone` writes a pref and swaps the whole screen out. Two taps landing in
 * the same frame — the CTA and Skip sit a thumb apart — must still be one
 * hand-over, not two.
 */
test('finishes once however many times it is asked', async () => {
  const done = jest.fn();
  const root = await mount(done);

  await press(root, en['intro.skip']);
  await press(root, en['intro.skip']);

  expect(done).toHaveBeenCalledTimes(1);
});

describe('hardware back', () => {
  it('steps back a slide rather than leaving', async () => {
    const done = jest.fn();
    const root = await mount(done);
    await press(root, en['intro.next']);

    expect(await back()).toBe(true);
    // Back on the first slide: the CTA is "Next" again, and nothing finished.
    expect(painted(root)).toContain(en['intro.next']);
    expect(done).not.toHaveBeenCalled();
  });

  it('declines the press on the first slide, so Android can close the app', async () => {
    const done = jest.fn();
    await mount(done);

    expect(await back()).toBe(false);
    // Backing out of the app is not the same as having read the intro.
    expect(done).not.toHaveBeenCalled();
  });
});
