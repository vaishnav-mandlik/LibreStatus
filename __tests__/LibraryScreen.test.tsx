/**
 * @format
 *
 * The Library's invisible half: what a failed album read is allowed to do to
 * the favourites list, which of two overlapping reloads wins, what the union
 * of album and vault counts, where the padlock points, and what an open viewer
 * does when its list empties under it.
 *
 * The grid and the viewer are stubbed as host components. Both own animation
 * loops and virtualised lists that have nothing to do with any of the above,
 * and stubbing them makes the props the screen hands down readable, which is
 * how the list, the selection and the viewer are inspected here.
 */

import React from 'react';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
} from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

/**
 * Still a host node called `StatusGrid`, so every `findAllByType` below reads
 * as before — but it counts its own renders on the way through, which is how
 * the performance tests at the end of this file measure what a rescan costs
 * the three mounted lists.
 */
const mockGridRenders = { n: 0 };
jest.mock('../src/components/StatusGrid', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    StatusGrid: (props: Record<string, unknown>) => {
      mockGridRenders.n += 1;
      return react.createElement('StatusGrid', props);
    },
  };
});
jest.mock('../src/components/StatusViewer', () => ({
  __esModule: true,
  default: 'StatusViewer',
}));

jest.mock('../src/utils/statusManager', () => {
  const actual = jest.requireActual('../src/utils/statusManager');
  return {
    ...actual,
    getSavedStatusFiles: jest.fn(),
    deleteSavedStatuses: jest.fn(),
    saveStatusToGallery: jest.fn(),
    peekGalleryAccess: jest.fn(),
    requestGalleryAccess: jest.fn(),
  };
});

jest.mock('../src/utils/vault', () => {
  const actual = jest.requireActual('../src/utils/vault');
  return {
    ...actual,
    addToVault: jest.fn(),
    listVault: jest.fn(),
    removeFromVault: jest.fn(),
  };
});

jest.mock('../src/utils/share', () => ({
  WHATSAPP_PACKAGE: 'com.whatsapp',
  __esModule: true,
  shareStatuses: jest.fn().mockResolvedValue(true),
  shareToWhatsApp: jest.fn().mockResolvedValue(true),
  isWhatsAppMissing: jest.fn().mockReturnValue(false),
}));

import LibraryScreen, {
  uniqueById,
  type LibraryScreenProps,
} from '../src/screens/LibraryScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { FeedbackProvider } from '../src/context/FeedbackContext';
import {
  deleteSavedStatuses,
  getSavedStatusFiles,
  saveStatusToGallery,
  peekGalleryAccess,
  requestGalleryAccess,
} from '../src/utils/statusManager';
import { en } from '../src/i18n/en';
import { addToVault, listVault, removeFromVault } from '../src/utils/vault';
import { DEFAULT_PREFS } from '../src/utils/prefs';
import { asMock, status } from '../test-support/testUtils';
import type { StatusFile } from '../src/types';

type Tree = ReactTestRenderer.ReactTestRenderer;

const gallery = asMock(getSavedStatusFiles);
const vaultList = asMock(listVault);
const removeVault = asMock(removeFromVault);
const vaultAdd = asMock(addToVault);
const deleteFiles = asMock(deleteSavedStatuses);
const saveToGallery = asMock(saveStatusToGallery);

/** A file as the gallery album lists it. */
const albumFile = (name: string, over: Partial<StatusFile> = {}): StatusFile =>
  status({ id: name, filename: name, uri: `content://media/${name}`, ...over });

/** A file as the vault lists it. */
const vaultFile = (name: string, over: Partial<StatusFile> = {}): StatusFile =>
  status({
    id: name,
    filename: name,
    uri: `file:///data/documents/vault/${name}`,
    inVault: true,
    isSaved: true,
    ...over,
  });

const shell = (props: LibraryScreenProps): React.ReactElement => (
  <SafeAreaProvider>
    <ThemeProvider>
      <LanguageProvider>
        <FeedbackProvider>
          <LibraryScreen {...props} />
        </FeedbackProvider>
      </LanguageProvider>
    </ThemeProvider>
  </SafeAreaProvider>
);

const trees: Tree[] = [];

afterEach(async () => {
  await act(async () => {
    for (const tree of trees.splice(0)) {
      tree.unmount();
    }
  });
  jest.clearAllMocks();
  mockGridRenders.n = 0;
});

beforeEach(() => {
  gallery.mockResolvedValue([]);
  vaultList.mockResolvedValue([]);
  removeVault.mockResolvedValue(true);
  vaultAdd.mockResolvedValue(null);
  deleteFiles.mockResolvedValue(true);
  saveToGallery.mockResolvedValue(true);
  asMock(peekGalleryAccess).mockResolvedValue('full');
  asMock(requestGalleryAccess).mockResolvedValue('full');
});

const mount = async (over: Partial<LibraryScreenProps> = {}) => {
  const props: LibraryScreenProps = {
    prefs: DEFAULT_PREFS,
    onPrefsChange: jest.fn(),
    reloadSignal: 0,
    dataVersion: 0,
    onLibraryChanged: jest.fn(),
    ...over,
  };
  let tree!: Tree;
  await act(async () => {
    tree = ReactTestRenderer.create(shell(props));
  });
  // Theme, language and the first album read all settle asynchronously.
  await act(async () => {});
  trees.push(tree);

  const rerender = async (patch: Partial<LibraryScreenProps>) => {
    Object.assign(props, patch);
    await act(async () => {
      tree.update(shell({ ...props }));
    });
    await act(async () => {});
  };

  return { tree, props, rerender };
};

/**
 * What the grid on screen was handed, in order.
 *
 * All three filter tabs are mounted side by side so the pager can reveal the
 * neighbouring list mid-drag, so this reads the first — the All page, which is
 * where these tests sit unless they say otherwise.
 */
const listed = (tree: Tree, page = 0): string[] =>
  (
    tree.root.findAllByType('StatusGrid' as never)[page].props
      .items as StatusFile[]
  ).map(f => f.id);

const viewer = (tree: Tree): ReactTestInstance =>
  tree.root.findByType('StatusViewer' as never);

const byLabel = (tree: Tree, label: string): ReactTestInstance =>
  tree.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];

/**
 * What the nearest gate above `node` does with a touch.
 *
 * A sheet's Modal has to stay mounted for its 160ms exit, so the only thing
 * that can stop its buttons answering on the way out is the `pointerEvents`
 * its host carries.
 */
const gate = (node: ReactTestInstance): string | undefined => {
  let up: ReactTestInstance | null = node.parent;
  while (up) {
    if (typeof up.props.pointerEvents === 'string') {
      return up.props.pointerEvents;
    }
    up = up.parent;
  }
  return undefined;
};

const press = async (node: ReactTestInstance): Promise<void> => {
  await act(async () => {
    node.props.onPress();
  });
  await act(async () => {});
};

const texts = (tree: Tree): string[] =>
  tree.root
    .findAllByType(Text)
    .map(n =>
      Array.isArray(n.props.children)
        ? n.props.children.join('')
        : n.props.children,
    )
    .filter((c): c is string => typeof c === 'string');

// ── Favourites are only unstarred on evidence ──────────────────────────────

test('an album that came back empty does not unstar the whole library', async () => {
  // Both readers answer a failure — a denied media permission, most often —
  // with an empty list, which is byte-identical to an empty library.
  const onPrefsChange = jest.fn();
  await mount({
    prefs: { ...DEFAULT_PREFS, favourites: ['a.jpg', 'b.jpg'] },
    onPrefsChange,
  });

  expect(gallery).toHaveBeenCalled();
  expect(onPrefsChange).not.toHaveBeenCalled();
});

test('a readable vault does not unstar the favourites the album held', async () => {
  vaultList.mockResolvedValue([vaultFile('v.jpg')]);
  const onPrefsChange = jest.fn();
  await mount({
    prefs: { ...DEFAULT_PREFS, favourites: ['a.jpg'] },
    onPrefsChange,
  });

  expect(onPrefsChange).not.toHaveBeenCalled();
});

test('a favourite the album stops listing is dropped once', async () => {
  gallery.mockResolvedValue([albumFile('a.jpg'), albumFile('b.jpg')]);
  const onPrefsChange = jest.fn();
  const { rerender } = await mount({
    prefs: { ...DEFAULT_PREFS, favourites: ['a.jpg'] },
    onPrefsChange,
  });
  expect(onPrefsChange).not.toHaveBeenCalled();

  // The album answers again, with files, and without a.jpg: it really is gone.
  gallery.mockResolvedValue([albumFile('b.jpg')]);
  await rerender({ dataVersion: 1 });

  expect(onPrefsChange).toHaveBeenCalledWith({ favourites: [] });
});

// ── Overlapping reloads ────────────────────────────────────────────────────

test('the slower of two overlapping reloads cannot win', async () => {
  gallery.mockResolvedValue([albumFile('a.jpg')]);
  const { tree, rerender } = await mount();
  expect(listed(tree)).toEqual(['a.jpg']);

  const pending: Array<(files: StatusFile[]) => void> = [];
  gallery.mockImplementation(
    () => new Promise<StatusFile[]>(resolve => pending.push(resolve)),
  );

  await rerender({ dataVersion: 1 });
  await rerender({ dataVersion: 2 });
  expect(pending).toHaveLength(2);

  // The newer read lands first, the older one afterwards.
  await act(async () => {
    pending[1]([albumFile('b.jpg')]);
  });
  await act(async () => {
    pending[0]([albumFile('a.jpg'), albumFile('stale.jpg')]);
  });
  await act(async () => {});

  expect(listed(tree)).toEqual(['b.jpg']);
});

// ── The union of album and vault ───────────────────────────────────────────

test('uniqueById keeps the first entry and leaves a clean list alone', () => {
  const a = albumFile('a.jpg');
  const clean = [a, albumFile('b.jpg')];
  expect(uniqueById(clean)).toBe(clean);
  expect(uniqueById([a, vaultFile('a.jpg')])).toEqual([a]);
});

test('a file listed by both the album and the vault is one item', async () => {
  gallery.mockResolvedValue([albumFile('dup.jpg')]);
  vaultList.mockResolvedValue([vaultFile('dup.jpg')]);
  const { tree } = await mount({
    prefs: {
      ...DEFAULT_PREFS,
      libraryCollection: 'fav',
      favourites: ['dup.jpg'],
    },
  });

  expect(listed(tree)).toEqual(['dup.jpg']);
  // …and the meta line counts it once, like the grid.
  expect(texts(tree).some(s => s.startsWith('1 file ·'))).toBe(true);
});

// ── The viewer ─────────────────────────────────────────────────────────────

test('the viewer forgets an index whose list emptied under it', async () => {
  gallery.mockResolvedValue([albumFile('a.jpg')]);
  const { tree, rerender } = await mount({
    prefs: {
      ...DEFAULT_PREFS,
      libraryCollection: 'fav',
      favourites: ['a.jpg'],
    },
  });

  await act(async () => {
    tree.root.findAllByType('StatusGrid' as never)[0].props.onPress(albumFile('a.jpg'));
  });
  expect(viewer(tree).props.visible).toBe(true);

  // Un-starring the only favourite empties the collection under the viewer.
  await rerender({
    prefs: { ...DEFAULT_PREFS, libraryCollection: 'fav', favourites: [] },
  });
  expect(viewer(tree).props.visible).toBe(false);

  // Whatever fills the list next must not reopen it on a status nobody chose.
  await rerender({
    prefs: {
      ...DEFAULT_PREFS,
      libraryCollection: 'fav',
      favourites: ['a.jpg'],
    },
  });
  expect(viewer(tree).props.visible).toBe(false);
});

// ── The padlock ────────────────────────────────────────────────────────────

const selectFirst = async (tree: Tree, item: StatusFile): Promise<void> => {
  await act(async () => {
    tree.root.findAllByType('StatusGrid' as never)[0].props.onLongPress(item);
  });
  await act(async () => {});
};

test('a selection that is entirely vaulted restores, wherever it is listed', async () => {
  const file = vaultFile('v.jpg');
  vaultList.mockResolvedValue([file]);
  const { tree } = await mount({
    prefs: {
      ...DEFAULT_PREFS,
      libraryCollection: 'fav',
      favourites: ['v.jpg'],
    },
  });

  await selectFirst(tree, file);
  // Outside the Vault collection the padlock used to run the move path, which
  // skips anything already vaulted: the button did nothing at all.
  await press(byLabel(tree, 'Restore to gallery'));

  expect(saveToGallery).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'v.jpg' }),
  );
  expect(removeVault).toHaveBeenCalledWith('v.jpg');
});

test('restoring from the Vault moves the file out, and Undo puts it back', async () => {
  const file = vaultFile('v.jpg');
  vaultList.mockResolvedValue([file]);
  const { tree } = await mount({
    prefs: { ...DEFAULT_PREFS, libraryCollection: 'vault' },
  });

  await selectFirst(tree, file);
  await press(byLabel(tree, 'Restore to gallery'));

  expect(saveToGallery).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'v.jpg' }),
  );
  expect(removeVault).toHaveBeenCalledWith('v.jpg');

  // The copy the restore left behind is what the undo has to work from.
  const copy = albumFile('v.jpg');
  gallery.mockResolvedValue([copy]);
  vaultList.mockResolvedValue([]);
  vaultAdd.mockResolvedValue(file);

  await press(byLabel(tree, 'Undo'));

  expect(vaultAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'v.jpg' }));
  expect(deleteFiles).toHaveBeenCalledWith([copy]);
});

// ── Delete ─────────────────────────────────────────────────────────────────

test('a delete that failed leaves the file starred', async () => {
  const file = albumFile('a.jpg');
  gallery.mockResolvedValue([file]);
  deleteFiles.mockResolvedValue(false);
  const onPrefsChange = jest.fn();
  const { tree } = await mount({
    prefs: { ...DEFAULT_PREFS, favourites: ['a.jpg'] },
    onPrefsChange,
  });

  await selectFirst(tree, file);
  await press(byLabel(tree, 'Delete 1'));
  await press(byLabel(tree, 'Remove'));

  expect(deleteFiles).toHaveBeenCalled();
  // The file is still in the library, so the star still belongs to it.
  expect(onPrefsChange).not.toHaveBeenCalled();
});

// ── One id, one item ───────────────────────────────────────────────────────

test('two album entries under one name are one tile, not two', async () => {
  /*
   * The album read names every file by its filename and deliberately keeps a
   * same-named file from the current and the legacy album as two entries, so
   * one source alone can hand back two items sharing an id.
   */
  gallery.mockResolvedValue([
    albumFile('a.jpg'),
    status({
      id: 'a.jpg',
      filename: 'a.jpg',
      uri: 'content://media/legacy/a.jpg',
    }),
  ]);
  const { tree } = await mount();

  expect(listed(tree)).toEqual(['a.jpg']);
  expect(texts(tree).some(s => s.startsWith('1 file ·'))).toBe(true);

  await selectFirst(tree, albumFile('a.jpg'));
  // The id is the selection key, so a collision counted one tap as two items
  // and offered to delete both.
  expect(texts(tree)).toContain('1 selected');
});

test('a long-press inside selection mode keeps what is already ticked', async () => {
  /*
   * A hold is only ever how selection is ENTERED (`logic.js:233` guards the
   * whole state change, and the Feed's identical handler returns early). This
   * screen guarded only the haptic and then reset the set regardless, so a
   * press that landed a little long on a second tile threw away every tick the
   * user had made and left them with just that one.
   */
  gallery.mockResolvedValue([albumFile('a.jpg'), albumFile('b.jpg')]);
  const { tree } = await mount();
  const grid = (): { props: { [k: string]: (f: StatusFile) => void } } =>
    tree.root.findAllByType('StatusGrid' as never)[0];

  await selectFirst(tree, albumFile('a.jpg'));
  await act(async () => {
    grid().props.onPress(albumFile('b.jpg'));
  });
  expect(texts(tree)).toContain('2 selected');

  await act(async () => {
    grid().props.onLongPress(albumFile('b.jpg'));
  });
  await act(async () => {});

  expect(texts(tree)).toContain('2 selected');
});

// ── The padlock has to say something ───────────────────────────────────────

test('a vault move that copied nothing says so instead of going quiet', async () => {
  const file = albumFile('a.jpg');
  gallery.mockResolvedValue([file]);
  vaultAdd.mockResolvedValue(null);
  const { tree } = await mount();

  await selectFirst(tree, file);
  await press(byLabel(tree, 'Move to Vault'));

  // Nothing was copied, so nothing may be deleted…
  expect(deleteFiles).not.toHaveBeenCalled();
  // …and the padlock has to admit it: it had already closed the selection, so
  // silence read as a button that does nothing.
  expect(texts(tree)).toContain('Could not save that status');
});

test('a refused gallery delete is not reported as a private move', async () => {
  /*
   * Android puts up its own "Allow … to delete this photo?" for media the app
   * did not write, and the answer can be Deny. The vault copy exists either
   * way, but the public copy is still in the gallery for anyone to scroll
   * past, so "moved to Vault · private" would be a false claim about the one
   * thing this feature promises.
   */
  const file = albumFile('a.jpg');
  gallery.mockResolvedValue([file]);
  vaultAdd.mockResolvedValue({ ...file, inVault: true });
  deleteFiles.mockResolvedValue(false);
  const { tree } = await mount();

  await selectFirst(tree, file);
  await press(byLabel(tree, 'Move to Vault'));

  expect(deleteFiles).toHaveBeenCalled();
  expect(texts(tree)).toContain(
    'Kept in the Vault, but the gallery copy is still there',
  );
  expect(texts(tree)).not.toContain('1 status moved to Vault');
});

test('a restore whose write throws reports the failure instead of rejecting', async () => {
  const file = vaultFile('v.jpg');
  vaultList.mockResolvedValue([file]);
  saveToGallery.mockRejectedValue(new Error('MediaStore is having a day'));
  const { tree } = await mount({
    prefs: { ...DEFAULT_PREFS, libraryCollection: 'vault' },
  });

  await selectFirst(tree, file);
  await press(byLabel(tree, 'Restore to gallery'));

  // The vault original is the only copy left, so it stays…
  expect(removeVault).not.toHaveBeenCalled();
  // …and the throw is reported rather than abandoning the loop and the toast.
  expect(texts(tree)).toContain('Could not save that status');
});

// ── The confirm sheet on its way out ───────────────────────────────────────

test('the confirm sheet keeps its count while it closes', async () => {
  const file = albumFile('a.jpg');
  gallery.mockResolvedValue([file, albumFile('b.jpg')]);
  const { tree } = await mount();

  await selectFirst(tree, file);
  await press(byLabel(tree, 'Select all'));
  await press(byLabel(tree, 'Delete 2'));
  expect(texts(tree)).toContain('Remove 2 statuses?');

  await press(byLabel(tree, 'Keep'));
  // The sheet stays mounted through its fade; reading the length of a list
  // that is already null retitled it "Remove 0 statuses?" on the way out.
  expect(texts(tree)).toContain('Remove 2 statuses?');
  expect(texts(tree)).not.toContain('Remove 0 statuses?');
});

test('a second tap on Remove while the sheet fades does not delete again', async () => {
  const file = albumFile('a.jpg');
  gallery.mockResolvedValue([file]);
  const { tree } = await mount();

  await selectFirst(tree, file);
  await press(byLabel(tree, 'Delete 1'));
  const remove = byLabel(tree, 'Remove');
  await press(remove);
  // Same button, still mounted: the sheet has 160ms of fade left to run.
  await press(remove);

  expect(deleteFiles).toHaveBeenCalledTimes(1);
  // The second run had an empty list, and toasted it.
  expect(texts(tree)).not.toContain('0 statuses removed');
});

test('a sheet on its way out stops answering touches', async () => {
  const file = albumFile('a.jpg');
  gallery.mockResolvedValue([file]);
  const { tree } = await mount();

  await selectFirst(tree, file);
  await press(byLabel(tree, 'Delete 1'));
  expect(gate(byLabel(tree, 'Remove'))).toBe('box-none');

  await press(byLabel(tree, 'Keep'));
  // Still mounted, still drawn, but visibly leaving: a second stab at Remove,
  // or at the scrim, must not reach anything.
  expect(gate(byLabel(tree, 'Remove'))).toBe('none');
  expect(gate(byLabel(tree, 'Close'))).toBe('none');
});

// ── Favourites and a reload that overlaps a toggle ─────────────────────────

test('a star added while a reload is in flight survives the prune', async () => {
  const a = albumFile('a.jpg');
  const b = albumFile('b.jpg');
  const c = albumFile('c.jpg');
  gallery.mockResolvedValue([a, b, c]);
  const onPrefsChange = jest.fn();
  const { tree, rerender } = await mount({
    prefs: { ...DEFAULT_PREFS, favourites: ['a.jpg', 'b.jpg'] },
    onPrefsChange,
  });

  // A reload that has not answered yet.
  let answer!: (files: StatusFile[]) => void;
  gallery.mockImplementation(
    () =>
      new Promise<StatusFile[]>(resolve => {
        answer = resolve;
      }),
  );
  await rerender({ dataVersion: 1 });

  // The user stars a third file from the viewer while that read is in flight.
  await act(async () => {
    viewer(tree).props.onToggleFavourite(c);
  });
  expect(onPrefsChange).toHaveBeenLastCalledWith({
    favourites: ['a.jpg', 'b.jpg', 'c.jpg'],
  });

  // b.jpg really is gone, so the prune fires — and it has to prune the list
  // that now holds the new star, not the one React has yet to hand back.
  await act(async () => {
    answer([a, c]);
  });
  await act(async () => {});

  expect(onPrefsChange).toHaveBeenLastCalledWith({
    favourites: ['a.jpg', 'c.jpg'],
  });
});

// ── What an interaction costs the three mounted lists ──────────────────────

/*
 * The pager keeps all three filter tabs mounted, and the grid hands `onPress`
 * straight to every tile it draws — Tile compares that prop by identity to
 * decide whether to re-render (Tile.tsx). A handler rebuilt on each reload
 * therefore re-rendered every tile on screen for a list whose contents had not
 * changed: 44 tile renders per rescan, measured on a 24-file library with the
 * three grids mounted, against 0 once the handler reads its list from a ref.
 */
test('the tap handler survives a reload and the files changing', async () => {
  gallery.mockResolvedValue([albumFile('a.jpg'), albumFile('b.jpg')]);
  vaultList.mockResolvedValue([]);
  const { tree, rerender } = await mount();

  const onPress = (): ((item: StatusFile) => void) =>
    tree.root.findAllByType('StatusGrid' as never)[0].props.onPress;
  const first = onPress();

  // A rescan that finds the same two files, listed as fresh objects.
  gallery.mockImplementation(async () => [albumFile('a.jpg'), albumFile('b.jpg')]);
  await rerender({ dataVersion: 1 });
  expect(onPress()).toBe(first);

  // And the handler is not stale: it opens the file the fresh list holds.
  await act(async () => {
    first(albumFile('a.jpg'));
  });
  expect(viewer(tree).props.index).toBe(0);
  expect(viewer(tree).props.visible).toBe(true);
});


// ── Delete from the viewer ─────────────────────────────────────────────────

/*
 * The viewer's own trash button. It confirms in there — the Library's sheet
 * cannot be reached from inside an Android Modal — so by the time this handler
 * runs the question has already been answered.
 */
test('deleting from the viewer removes the file and closes it', async () => {
  const file = albumFile('a.jpg');
  const other = albumFile('b.jpg');
  gallery.mockResolvedValue([file, other]);
  const onLibraryChanged = jest.fn();
  const { tree } = await mount({ onLibraryChanged });

  await act(async () => {
    tree.root.findAllByType('StatusGrid' as never)[0].props.onPress(file);
  });
  expect(viewer(tree).props.visible).toBe(true);

  // What the library holds once the file is gone.
  gallery.mockResolvedValue([other]);
  await act(async () => {
    viewer(tree).props.onDelete(file);
  });
  await act(async () => {});

  expect(deleteFiles).toHaveBeenCalledWith([file]);
  // Left open, it would page onto whatever slid into the deleted file's place.
  expect(viewer(tree).props.visible).toBe(false);
  expect(listed(tree)).toEqual(['b.jpg']);
  expect(onLibraryChanged).toHaveBeenCalled();
});

test('a vaulted file deleted from the viewer leaves the vault, not the gallery', async () => {
  const file = vaultFile('v.jpg');
  vaultList.mockResolvedValue([file]);
  const { tree } = await mount({
    prefs: { ...DEFAULT_PREFS, libraryCollection: 'vault' },
  });

  await act(async () => {
    tree.root.findAllByType('StatusGrid' as never)[0].props.onPress(file);
  });
  vaultList.mockResolvedValue([]);
  await act(async () => {
    viewer(tree).props.onDelete(file);
  });
  await act(async () => {});

  expect(removeVault).toHaveBeenCalledWith('v.jpg');
  // The vault copy never was in the gallery, so nothing there is touched.
  expect(deleteFiles).not.toHaveBeenCalled();
});

/**
 * The grid is a host stub in this file, so the empty state it is handed is read
 * off its `empty` prop rather than found painted.
 */
type EmptyProps = {
  title: string;
  body: string;
  cta?: { label: string; onPress: () => void };
};
const emptyState = (tree: Tree): EmptyProps =>
  (
    tree.root.findAllByType('StatusGrid' as never)[0].props as {
      empty: React.ReactElement<EmptyProps>;
    }
  ).empty.props;

/*
 * An empty Favourites or Vault used to say "Nothing saved yet" beside an All
 * chip that counted forty files, and told the user to save another one.
 */
describe('the empty state names its collection', () => {
  it('favourites', async () => {
    gallery.mockResolvedValue([albumFile('a.jpg')]);
    const { tree } = await mount({
      prefs: { ...DEFAULT_PREFS, libraryCollection: 'fav', favourites: [] },
    });

    expect(emptyState(tree).title).toBe(en['empty.favTitle']);
    expect(emptyState(tree).cta).toBeUndefined();
  });

  it('vault, and never offers the media permission there', async () => {
    asMock(peekGalleryAccess).mockResolvedValue('none');
    const { tree } = await mount({
      prefs: { ...DEFAULT_PREFS, libraryCollection: 'vault' },
    });

    expect(emptyState(tree).title).toBe(en['empty.vaultTitle']);
    // The Vault is app storage; photo access has nothing to do with it.
    expect(emptyState(tree).cta).toBeUndefined();
  });
});

// ── Photo and video access ─────────────────────────────────────────────────

/*
 * The permission is asked for here, from the empty state, and nowhere the user
 * did not tap. An empty Library over an unheld permission may be hiding saves
 * from before a reinstall, so that is what the copy says and what the CTA asks.
 */
test('an empty Library without media access offers to ask, and reloads once granted', async () => {
  asMock(peekGalleryAccess).mockResolvedValue('none');
  const { tree } = await mount();

  const empty = emptyState(tree);
  expect(empty.body).toBe(en['empty.libraryAccessBody']);
  expect(empty.cta?.label).toBe(en['empty.allowAccess']);

  const file = albumFile('a.jpg');
  asMock(requestGalleryAccess).mockResolvedValue('full');
  asMock(peekGalleryAccess).mockResolvedValue('full');
  gallery.mockResolvedValue([file]);
  await act(async () => {
    empty.cta?.onPress();
  });
  await act(async () => {});

  expect(requestGalleryAccess).toHaveBeenCalledTimes(1);
  expect(listed(tree)).toEqual(['a.jpg']);
});

test('the CTA stays off when access is held and the Library is simply empty', async () => {
  const { tree } = await mount();

  expect(emptyState(tree).body).toBe(en['empty.libraryBody']);
  expect(emptyState(tree).cta).toBeUndefined();
});
