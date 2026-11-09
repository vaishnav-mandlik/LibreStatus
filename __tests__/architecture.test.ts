/**
 * @format
 *
 * Structural guards for invariants that types cannot express.
 *
 * Each of these encodes a bug that actually shipped in this rewrite, so the
 * point is regression pressure, not style policing.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

const read = (relative: string): string =>
  fs.readFileSync(path.join(ROOT, relative), 'utf8');

/**
 * Source with comments removed, so a guard reads code and not the prose that
 * explains why the guarded thing is forbidden. A `//` right after a colon or
 * quote is a URL or a string ("file://"), not a comment.
 */
const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...walk(rel));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
};

const SRC_FILES = walk('src').concat(['App.tsx']);

const TOKENS = 'src/theme/tokens.ts';

/** Everything that draws: the whole tree minus the one file allowed to own the raw values. */
const STYLED_FILES = SRC_FILES.filter(file => file !== TOKENS);

describe('preferences have exactly one owner', () => {
  /*
   * The app shell owns `Prefs` and passes it down. Three components each
   * holding a full copy and calling savePrefs meant the last writer serialised
   * its stale snapshot over everyone else's changes — turning on auto-save in
   * Tools was silently reverted by the next sort change in the Feed.
   */
  it('only the shell and the prefs module itself persist prefs', () => {
    const writers = SRC_FILES.filter(file => /\bsavePrefs\b/.test(read(file)));
    expect(writers.sort()).toEqual(['App.tsx', 'src/utils/prefs.ts']);
  });

  it('no screen loads prefs behind the shell’s back', () => {
    const readers = SRC_FILES.filter(file => /\bloadPrefs\b/.test(read(file)));
    expect(readers.sort()).toEqual(['App.tsx', 'src/utils/prefs.ts']);
  });
});

describe('no hardcoded user-facing colour', () => {
  /*
   * Every colour comes from `theme.*` so both palettes stay coherent and the
   * prototype's values live in exactly one place. tokens.ts is the only file
   * allowed to spell a colour out; even marks drawn over media go through
   * named tokens (`white`, `onMedia`, ...). The `transparent` keyword is not a
   * colour value and stays allowed everywhere.
   */
  const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
  const RGBA = /\brgba?\(/g;

  it('keeps hex and rgb(a) literals out of every file but tokens.ts', () => {
    const offenders: string[] = [];
    for (const file of STYLED_FILES) {
      const body = stripComments(read(file));
      for (const match of body.match(HEX) ?? []) {
        offenders.push(`${file}: ${match}`);
      }
      for (const match of body.match(RGBA) ?? []) {
        offenders.push(`${file}: ${match}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('still lets tokens.ts define the palette', () => {
    expect(read(TOKENS)).toMatch(HEX);
  });
});

describe('typography goes through the token ramp', () => {
  /*
   * The two faces ship as named-weight files. Setting `fontWeight` on top of
   * one makes Android synthesise a fake bold over the real SemiBold, and a
   * `fontFamily` literal bypasses the ramp so a size or tracking fix in
   * tokens.ts never reaches it. `type.*`, `sans()` and `mono()` are the only
   * way to pick a face.
   */
  it('never sets fontWeight outside tokens.ts', () => {
    const offenders = STYLED_FILES.filter(file =>
      /\bfontWeight\b/.test(stripComments(read(file))),
    );
    expect(offenders).toEqual([]);
  });

  it('never names a fontFamily outside tokens.ts', () => {
    const offenders = STYLED_FILES.filter(file =>
      /\bfontFamily\s*:/.test(stripComments(read(file))),
    );
    expect(offenders).toEqual([]);
  });
});

describe('icons are the prototype’s own glyphs', () => {
  /*
   * `src/components/icons.tsx` carries the prototype's SVG paths. A Material
   * glyph from react-native-vector-icons is always the nearest shape, never
   * the same one, and the owner rejected three passes over exactly that.
   */
  it('imports no react-native-vector-icons anywhere in the app', () => {
    const offenders = SRC_FILES.filter(file =>
      /['"]react-native-vector-icons(?:\/|['"])/.test(
        stripComments(read(file)),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

describe('translation discipline', () => {
  it('every screen that renders copy pulls it from the dictionary', () => {
    // Presentational primitives take their labels as props, so they are exempt.
    const exempt = new Set([
      'src/components/ui.tsx',
      'src/components/StatusGrid.tsx',
    ]);
    const screens = SRC_FILES.filter(
      f => f.startsWith('src/screens/') && !exempt.has(f),
    );
    expect(screens.length).toBeGreaterThan(0);
    for (const screen of screens) {
      expect(read(screen)).toMatch(/\bt\(|\btp\(/);
    }
  });

  it('does not leave a raw JSX string literal in a screen', () => {
    const offenders: string[] = [];
    for (const file of SRC_FILES.filter(f => f.startsWith('src/screens/'))) {
      for (const line of read(file).split('\n')) {
        // A bare word between tags, e.g. `>Feedback<`, that is not an
        // expression. The product name is deliberately never translated.
        const match = line.match(/>\s*([A-Z][A-Za-z ]{3,})\s*</);
        if (match && !match[1].includes('Status Saver')) {
          offenders.push(`${file}: ${match[1].trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('app code stays inside the React Native runtime', () => {
  /*
   * `tsconfig.json` pulls in Node's typings so these very tests can read the
   * source tree. That would otherwise let app code import `fs` or `path` and
   * still typecheck, only to crash at runtime inside the bundle.
   */
  it('imports no Node builtin outside the tests', () => {
    const builtins = [
      'fs', 'path', 'os', 'child_process', 'crypto', 'http', 'https',
      'net', 'stream', 'zlib', 'util', 'worker_threads',
    ];
    const offenders: string[] = [];
    for (const file of SRC_FILES) {
      const body = read(file);
      for (const builtin of builtins) {
        const pattern = new RegExp(
          `(?:from|require\\()\\s*['"](?:node:)?${builtin}['"]`,
        );
        if (pattern.test(body)) {
          offenders.push(`${file}: ${builtin}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('release identity has a single source', () => {
  it('no file hardcodes a version string outside appInfo and the gradle build', () => {
    const offenders = SRC_FILES.filter(file => {
      if (file === 'src/appInfo.ts') {
        return false;
      }
      return /['"`]\d+\.\d+\.\d+['"`]/.test(read(file));
    });
    expect(offenders).toEqual([]);
  });

  it('appInfo falls back to the same version the gradle build declares', () => {
    const gradle = read('android/app/build.gradle');
    const declared = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
    const fallback = read('src/appInfo.ts').match(
      /APP_VERSION: string =[\s\S]*?'([^']+)'/,
    )?.[1];
    expect(declared).toBeTruthy();
    expect(fallback).toBe(declared);
  });
});
