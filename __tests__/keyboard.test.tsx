/**
 * @format
 *
 * The keyboard used to be Android's problem: `adjustResize` shrank the window
 * and every scroll view came with it. From Android 15 the system draws edge to
 * edge for apps targeting SDK 35 and up and that flag does nothing, so the
 * keyboard slides straight over the layout. These pin the arithmetic that puts
 * the covered content back on screen.
 */

import React, { useRef } from 'react';
import { Keyboard, Text, View, type KeyboardEvent } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { useKeyboardHeight, useKeyboardOverlap } from '../src/utils/keyboard';

/** The container's position in the window, as `measureInWindow` reports it. */
let boxFrame = { x: 0, y: 240, width: 1080, height: 1988 };
let measured = 0;

const Probe: React.FC = () => {
  const ref = useRef<View>(null);
  // react-test-renderer has no layout, so the ref stands in for the host view.
  (ref as { current: unknown }).current = {
    measureInWindow: (
      callback: (x: number, y: number, w: number, h: number) => void,
    ) => {
      measured += 1;
      callback(boxFrame.x, boxFrame.y, boxFrame.width, boxFrame.height);
    },
  };
  const overlap = useKeyboardOverlap(ref);
  return <Text>{`overlap:${overlap}`}</Text>;
};

const trees: ReactTestRenderer.ReactTestRenderer[] = [];

const render = async (): Promise<ReactTestRenderer.ReactTestRenderer> => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<Probe />);
  });
  trees.push(tree);
  return tree;
};

const reads = (tree: ReactTestRenderer.ReactTestRenderer): string =>
  tree.root.findByType(Text).props.children as string;

/*
 * React Native's Keyboard has no emitter to drive in a test environment, so
 * the listeners it is handed are captured and called directly. Removing one
 * unregisters it, which is what proves the hook stops listening.
 */
type Handler = (event: KeyboardEvent) => void;
let listeners: Array<{ type: string; handler: Handler }> = [];

const fire = async (
  type: string,
  event: Partial<KeyboardEvent>,
): Promise<void> => {
  await act(async () => {
    for (const entry of listeners.filter(l => l.type === type)) {
      entry.handler(event as KeyboardEvent);
    }
  });
};

/** Raises the keyboard with its top edge at `screenY`. */
const show = (screenY: number): Promise<void> =>
  fire('keyboardDidShow', {
    endCoordinates: {
      screenY,
      height: 2340 - screenY,
      width: 1080,
      screenX: 0,
    },
  });

const hide = (): Promise<void> => fire('keyboardDidHide', {});

beforeEach(() => {
  boxFrame = { x: 0, y: 240, width: 1080, height: 1988 };
  measured = 0;
  listeners = [];
  jest
    .spyOn(Keyboard, 'addListener')
    .mockImplementation((type: string, handler: Handler) => {
      const entry = { type, handler };
      listeners.push(entry);
      return {
        remove: () => {
          listeners = listeners.filter(l => l !== entry);
        },
      } as ReturnType<typeof Keyboard.addListener>;
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

describe('useKeyboardOverlap', () => {
  it('is zero until the keyboard comes up', async () => {
    const tree = await render();
    expect(reads(tree)).toBe('overlap:0');
    expect(measured).toBe(0);
  });

  it('reports how much of the container the keyboard covers', async () => {
    // Container spans 240..2228 in the window; the keyboard's top is at 1340.
    const tree = await render();
    await show(1340);
    expect(reads(tree)).toBe('overlap:888');
  });

  it('counts only the container, not what sits below it', async () => {
    /*
     * The tab bar under this list is already behind the keyboard. Padding by
     * the keyboard's full height (2340 - 1340 = 1000) would push the content
     * up by an extra tab bar's worth and leave a gap under the last row.
     */
    const tree = await render();
    await show(1340);
    expect(reads(tree)).not.toBe('overlap:1000');
    expect(reads(tree)).toBe('overlap:888');
  });

  it('is zero when the keyboard stops below the container', async () => {
    // A short container well clear of the keyboard: nothing to pad.
    boxFrame = { x: 0, y: 100, width: 1080, height: 400 };
    const tree = await render();
    await show(1340);
    expect(reads(tree)).toBe('overlap:0');
  });

  it('goes back to zero when the keyboard goes down', async () => {
    const tree = await render();
    await show(1340);
    expect(reads(tree)).toBe('overlap:888');
    await hide();
    expect(reads(tree)).toBe('overlap:0');
  });

  it('re-measures when the keyboard changes height', async () => {
    // Switching to a taller keyboard, or an emoji panel opening over it.
    const tree = await render();
    await show(1340);
    await show(1100);
    expect(reads(tree)).toBe('overlap:1128');
    expect(measured).toBe(2);
  });

  it('ignores an event with no end coordinates rather than throwing', async () => {
    const tree = await render();
    await fire('keyboardDidShow', {});
    expect(reads(tree)).toBe('overlap:0');
  });

  it('stops listening once unmounted', async () => {
    const tree = await render();
    await act(async () => {
      tree.unmount();
    });
    trees.splice(trees.indexOf(tree), 1);
    // A late event must not measure or set state on a gone component.
    await show(1340);
    expect(measured).toBe(0);
  });
});

describe('useKeyboardHeight', () => {
  const Height: React.FC = () => <Text>{`height:${useKeyboardHeight()}`}</Text>;

  const renderHeight =
    async (): Promise<ReactTestRenderer.ReactTestRenderer> => {
      let tree!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        tree = ReactTestRenderer.create(<Height />);
      });
      trees.push(tree);
      return tree;
    };

  it('is the keyboard height, not the container overlap', async () => {
    /*
     * The toast host is positioned against the whole window, so it has to
     * clear the keyboard's full height. Lifting it by the scroll view's
     * overlap instead left it inside the keyboard, which is where "Enter at
     * least 6 digits" was going.
     */
    const tree = await renderHeight();
    await show(1340);
    expect(reads(tree)).toBe('height:1000');
  });

  it('is zero while the keyboard is down', async () => {
    const tree = await renderHeight();
    expect(reads(tree)).toBe('height:0');
    await show(1340);
    await hide();
    expect(reads(tree)).toBe('height:0');
  });

  it('treats an event with no height as zero', async () => {
    const tree = await renderHeight();
    await show(1340);
    await fire('keyboardDidShow', {});
    expect(reads(tree)).toBe('height:0');
  });
});
