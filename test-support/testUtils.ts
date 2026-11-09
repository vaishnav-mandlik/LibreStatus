/**
 * @format
 *
 * Shared helpers for the test suites. Lives outside __tests__ so Jest does
 * not try to run it as a suite of its own.
 */

import { Platform } from 'react-native';
import type { StatusFile } from '../src/types';

/**
 * Jest resolves the iOS Platform module. The storage layer is Android-only, so
 * tests pin the platform explicitly rather than relying on the default.
 * Module registries are per test file, so this cannot leak between files.
 */
export const setPlatform = (
  os: 'android' | 'ios',
  version: number,
): void => {
  Object.defineProperty(Platform, 'OS', {
    value: os,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(Platform, 'Version', {
    get: () => version,
    configurable: true,
  });
};

export const status = (over: Partial<StatusFile> = {}): StatusFile => ({
  id: over.filename ?? over.id ?? 'a.jpg',
  uri: 'file:///src/a.jpg',
  filename: 'a.jpg',
  type: 'image',
  timestamp: 1_700_000_000_000,
  size: 2048,
  ...over,
});

/** A directory entry as react-native-fs would return it. */
export const dirEntry = (
  name: string,
  size: number,
  extra: { mtime?: Date; isFile?: boolean; dir?: string } = {},
) => ({
  name,
  path: `${extra.dir ?? '/dir'}/${name}`,
  size,
  mtime: extra.mtime ?? new Date(1_700_000_000_000),
  isFile: () => extra.isFile ?? true,
  isDirectory: () => !(extra.isFile ?? true),
});

/** A gallery edge as CameraRoll.getPhotos would return it. */
export const galleryEdge = (
  filename: string,
  over: {
    size?: number;
    type?: 'image' | 'video';
    timestamp?: number;
    uri?: string;
  } = {},
) => ({
  node: {
    type: over.type ?? 'image',
    timestamp: over.timestamp ?? 1_700_000_000,
    image: {
      uri: over.uri ?? `content://media/${filename}`,
      filename,
      fileSize: over.size ?? 2048,
      playableDuration: over.type === 'video' ? 12 : undefined,
    },
  },
});

export const asMock = (fn: unknown): jest.Mock => fn as jest.Mock;
