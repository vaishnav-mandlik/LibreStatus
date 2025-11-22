export interface StatusFile {
  id: string;
  uri: string;
  filename: string;
  type: 'image' | 'video';
  timestamp: number;
  size: number;
  isSaved?: boolean;
}

export interface StatusFolder {
  path: string;
  exists: boolean;
}
