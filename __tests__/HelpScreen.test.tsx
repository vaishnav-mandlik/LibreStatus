/**
 * @format
 *
 * Help is five questions that expand into answers. What matters for a screen
 * reader is that an answer, once open, is an element of its own: as a child of
 * the labelled question button it was never announced and could not be reached.
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
} from 'react-test-renderer';

import HelpScreen from '../src/screens/HelpScreen';
import { FeedbackProvider } from '../src/context/FeedbackContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { en } from '../src/i18n/en';

const trees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (): Promise<ReactTestInstance> => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <LanguageProvider>
          <FeedbackProvider>
            <HelpScreen onClose={() => undefined} />
          </FeedbackProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );
  });
  await act(async () => {});
  trees.push(tree);
  return tree.root;
};

afterEach(() => {
  for (const tree of trees.splice(0)) {
    act(() => {
      tree.unmount();
    });
  }
});

const question = (root: ReactTestInstance, label: string): ReactTestInstance =>
  root.find(
    n =>
      n.props.accessibilityRole === 'button' &&
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  );

const textsIn = (node: ReactTestInstance): string[] =>
  node
    .findAllByType(Text)
    .map(t => t.props.children)
    .filter((c): c is string => typeof c === 'string');

test('an expanded answer is its own element, outside the question button', async () => {
  const root = await mount();
  // The first question opens expanded by design.
  const first = question(root, en['help.q1']);
  expect(first.props.accessibilityState).toEqual({ expanded: true });
  expect(textsIn(root)).toContain(en['help.a1']);
  // …and its answer is not swallowed by the button's own accessible node.
  expect(textsIn(first)).not.toContain(en['help.a1']);

  const second = question(root, en['help.q2']);
  expect(second.props.accessibilityState).toEqual({ expanded: false });
  await act(async () => {
    second.props.onPress();
  });

  const opened = question(root, en['help.q2']);
  expect(opened.props.accessibilityState).toEqual({ expanded: true });
  expect(textsIn(root)).toContain(en['help.a2']);
  expect(textsIn(opened)).not.toContain(en['help.a2']);
  // One open at a time, as before.
  expect(textsIn(root)).not.toContain(en['help.a1']);
});

test('the answers say what the app does', async () => {
  // The album the app writes is "Status"; "Status Saver" is only the legacy
  // album it reads. Help used to name the wrong one.
  expect(en['help.a2']).toContain('an album called Status.');
  expect(en['help.a2']).not.toContain('Status Saver.');
});
