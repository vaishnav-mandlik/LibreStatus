export interface StatusFile {
  id: string;
  uri: string;
  filename: string;
  type: 'image' | 'video';
  timestamp: number;
  size: number;
  isSaved?: boolean;
  /** True while the file lives in the private vault rather than the gallery. */
  inVault?: boolean;
  /** Duration in seconds, when known (vault/library videos). */
  duration?: number;
}

export interface StatusFolder {
  path: string;
  exists: boolean;
}

/** Which media types a list is showing. */
export type MediaFilter = 'all' | 'photos' | 'videos';

/** Ordering applied to a list. */
export type SortOrder = 'new' | 'old' | 'big' | 'type';

/** Library sub-collections. */
export type Collection = 'all' | 'fav' | 'vault';

/** What auto-save is allowed to keep. */
export type AutoMode = 'both' | 'photos' | 'videos';

export type TabKey = 'feed' | 'library' | 'tools';

/** A date-bucketed run of items, used by the sectioned lists. */
export interface StatusSection {
  key: string;
  /** Already-translated heading. */
  title: string;
  data: StatusFile[];
}

/** Aggregate storage figures shown on the Tools screen. */
export interface StorageStats {
  photoBytes: number;
  videoBytes: number;
  totalBytes: number;
  savedCount: number;
  vaultCount: number;
  cacheBytes: number;
}
