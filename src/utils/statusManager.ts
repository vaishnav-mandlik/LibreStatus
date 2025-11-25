import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { StatusFile, StatusFolder } from '../types';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { hasFolderAccess, listFolderFiles } from './folderPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_STATUS_IDS_KEY = '@saved_status_ids';

const WHATSAPP_STATUS_PATHS = [
  // Legacy paths (Android 10 and below) - More accessible
  `${RNFS.ExternalStorageDirectoryPath}/WhatsApp/Media/.Statuses`,
  '/storage/emulated/0/WhatsApp/Media/.Statuses',
  '/sdcard/WhatsApp/Media/.Statuses',
  // New paths (Android 11+) - Require MANAGE_EXTERNAL_STORAGE
  `${RNFS.ExternalStorageDirectoryPath}/Android/media/com.whatsapp/WhatsApp/Media/.Statuses`,
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
  '/sdcard/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
  `${RNFS.ExternalStorageDirectoryPath}/Android/data/com.whatsapp/files/Statuses`,
];

const WHATSAPP_BUSINESS_PATHS = [
  `${RNFS.ExternalStorageDirectoryPath}/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses`,
  `${RNFS.ExternalStorageDirectoryPath}/WhatsApp Business/Media/.Statuses`,
  '/storage/emulated/0/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses',
  '/storage/emulated/0/WhatsApp Business/Media/.Statuses',
  `${RNFS.ExternalStorageDirectoryPath}/Android/data/com.whatsapp.w4b/files/Statuses`,
  '/sdcard/WhatsApp Business/Media/.Statuses',
  '/sdcard/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses',
];

export const findStatusFolder = async (): Promise<StatusFolder | null> => {
  if (Platform.OS !== 'android') {
    return null;
  }

  console.log('🔍 Searching for WhatsApp status folder...');
  console.log('📂 External Storage Path:', RNFS.ExternalStorageDirectoryPath);

  for (const path of WHATSAPP_STATUS_PATHS) {
    try {
      console.log(`Checking path: ${path}`);
      const exists = await RNFS.exists(path);
      console.log(`Path exists: ${exists}`);

      if (exists) {
        // Check if we can read the directory
        try {
          const files = await RNFS.readDir(path);
          console.log(`✅ Found WhatsApp status folder: ${path}`);
          console.log(`📄 Files found: ${files.length}`);
          return { path, exists: true };
        } catch (readError) {
          console.log(`⚠️ Cannot read directory ${path}:`, readError);
          continue;
        }
      }
    } catch (error) {
      console.log(`❌ Error checking path ${path}:`, error);
    }
  }

  console.log('❌ No WhatsApp status folder found');
  return null;
};

export const findBusinessStatusFolder =
  async (): Promise<StatusFolder | null> => {
    if (Platform.OS !== 'android') {
      return null;
    }

    console.log('🔍 Searching for WhatsApp Business status folder...');

    for (const path of WHATSAPP_BUSINESS_PATHS) {
      try {
        console.log(`Checking path: ${path}`);
        const exists = await RNFS.exists(path);
        console.log(`Path exists: ${exists}`);

        if (exists) {
          try {
            const files = await RNFS.readDir(path);
            console.log(`✅ Found Business status folder: ${path}`);
            console.log(`📄 Files found: ${files.length}`);
            return { path, exists: true };
          } catch (readError) {
            console.log(`⚠️ Cannot read directory ${path}:`, readError);
            continue;
          }
        }
      } catch (error) {
        console.log(`❌ Error checking path ${path}:`, error);
      }
    }

    console.log('❌ No Business status folder found');
    return null;
  };

/**
 * Get all status files from WhatsApp or WhatsApp Business
 */
export const getStatusFiles = async (
  type: 'whatsapp' | 'business' = 'whatsapp',
): Promise<StatusFile[]> => {
  try {
    console.log(`🔍 Getting status files for ${type}...`);

    // For Android 11+, try SAF first
    if (Platform.OS === 'android' && Platform.Version >= 30) {
      const safUri = await hasFolderAccess(type);
      if (safUri) {
        console.log('📁 Using SAF to access files');
        const safFiles = await listFolderFiles(safUri);

        if (safFiles.length > 0) {
          return safFiles.map((file: any) => ({
            id: file.name,
            uri: file.uri,
            filename: file.name,
            type:
              file.type?.startsWith('video/') ||
              file.name?.toLowerCase().endsWith('.mp4')
                ? 'video'
                : 'image',
            timestamp: file.lastModified || Date.now(),
            size: file.size || 0,
          }));
        }
      }
    }

    // Fallback to legacy file system access
    console.log('📂 Using file system access');
    const statusFolder =
      type === 'business'
        ? await findBusinessStatusFolder()
        : await findStatusFolder();

    if (!statusFolder) {
      console.log('❌ Status folder not found');
      return [];
    }

    console.log(`📂 Reading files from: ${statusFolder.path}`);
    const files = await RNFS.readDir(statusFolder.path);
    console.log(`📊 Total files in directory: ${files.length}`);

    if (files.length === 0) {
      console.log('⚠️ Directory is empty');
      return [];
    }

    const statusFiles: StatusFile[] = [];

    for (const file of files) {
      console.log(
        `🔍 Processing: ${file.name}, isFile: ${file.isFile()}, size: ${
          file.size
        }`,
      );

      if (file.name === '.nomedia' || file.name.startsWith('.')) {
        continue;
      }

      if (!file.isFile() || file.size < 1000) {
        continue;
      }

      const fileName = file.name.toLowerCase();
      let fileType: 'image' | 'video' | null = null;

      const parts = fileName.split('.');
      const extension = parts.length > 1 ? parts[parts.length - 1] : '';

      if (
        ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic'].includes(extension)
      ) {
        fileType = 'image';
      } else if (
        ['mp4', '3gp', 'avi', 'mkv', 'mov', 'webm', 'flv'].includes(extension)
      ) {
        fileType = 'video';
      } else if (extension === '' && file.size > 10000) {
        fileType = 'image';
      }

      if (fileType) {
        statusFiles.push({
          id: file.name,
          uri: 'file://' + file.path,
          filename: file.name,
          type: fileType,
          timestamp: file.mtime ? new Date(file.mtime).getTime() : Date.now(),
          size: file.size,
        });
      }
    }

    console.log(`\n✅ Total valid statuses found: ${statusFiles.length}`);
    return statusFiles.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('❌ Error reading status files:', error);
    return [];
  }
};

/**
 * Get saved status IDs from AsyncStorage
 */
export const getSavedStatusIds = async (): Promise<string[]> => {
  try {
    const saved = await AsyncStorage.getItem(SAVED_STATUS_IDS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved status IDs:', error);
    return [];
  }
};

/**
 * Sync saved status IDs with actual gallery files
 * Removes IDs for files that no longer exist in gallery
 */
export const syncSavedStatusIds = async (): Promise<string[]> => {
  try {
    const savedIds = await getSavedStatusIds();
    const galleryFiles = await getSavedStatusFiles();

    // Create a set of filenames from gallery for efficient lookup
    const galleryFilenames = new Set(
      galleryFiles.map(f => f.filename?.toLowerCase()).filter(Boolean),
    );

    // Filter out IDs that don't exist in gallery anymore
    const validIds = savedIds.filter(id => {
      // The ID is the filename from the status file
      const idLower = id.toLowerCase();

      // Check if this filename exists in gallery
      if (galleryFilenames.has(idLower)) {
        return true;
      }

      // Also check if any gallery file's URI contains this ID
      // (in case the filename is embedded in the URI)
      return galleryFiles.some(file => {
        const filenameLower = file.filename?.toLowerCase();
        return (
          filenameLower === idLower || file.uri.toLowerCase().includes(idLower)
        );
      });
    });

    // Update AsyncStorage with synced IDs
    if (validIds.length !== savedIds.length) {
      await AsyncStorage.setItem(
        SAVED_STATUS_IDS_KEY,
        JSON.stringify(validIds),
      );
      console.log(`Synced saved IDs: ${savedIds.length} -> ${validIds.length}`);
    }

    return validIds;
  } catch (error) {
    console.error('Error syncing saved status IDs:', error);
    return await getSavedStatusIds();
  }
};

/**
 * Add a status ID to saved list
 */
export const addSavedStatusId = async (statusId: string): Promise<void> => {
  try {
    const savedIds = await getSavedStatusIds();
    if (!savedIds.includes(statusId)) {
      savedIds.push(statusId);
      await AsyncStorage.setItem(
        SAVED_STATUS_IDS_KEY,
        JSON.stringify(savedIds),
      );
    }
  } catch (error) {
    console.error('Error saving status ID:', error);
  }
};

/**
 * Remove a status ID from saved list
 */
export const removeSavedStatusId = async (statusId: string): Promise<void> => {
  try {
    const savedIds = await getSavedStatusIds();
    const filtered = savedIds.filter(id => id !== statusId);
    await AsyncStorage.setItem(SAVED_STATUS_IDS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing status ID:', error);
  }
};

export const saveStatusToGallery = async (
  statusFile: StatusFile,
): Promise<boolean> => {
  try {
    console.log(`💾 Saving to gallery: ${statusFile.filename}`);
    console.log(`📍 URI: ${statusFile.uri}`);

    let uriToSave = statusFile.uri;

    // If it's a content URI (from SAF), we need to copy it to a temp location first
    if (statusFile.uri.startsWith('content://')) {
      console.log('📋 Detected content URI, copying to temp location...');

      const tempDir = `${RNFS.CachesDirectoryPath}/statuses`;
      const tempFilePath = `${tempDir}/${statusFile.filename}`;

      // Create temp directory if it doesn't exist
      const tempDirExists = await RNFS.exists(tempDir);
      if (!tempDirExists) {
        await RNFS.mkdir(tempDir);
      }

      // Copy the file from content URI to temp location
      try {
        // Read the file from content URI
        const fileContent = await RNFS.readFile(statusFile.uri, 'base64');
        // Write to temp location
        await RNFS.writeFile(tempFilePath, fileContent, 'base64');

        uriToSave = 'file://' + tempFilePath;
        console.log(`✅ Copied to temp: ${tempFilePath}`);
      } catch (copyError) {
        console.error('❌ Error copying file:', copyError);
        return false;
      }
    }

    // Save to gallery in Status album
    console.log(`💾 Saving to CameraRoll: ${uriToSave}`);
    await CameraRoll.save(uriToSave, {
      type: statusFile.type === 'video' ? 'video' : 'photo',
      album: 'Status',
    });

    // Mark as saved in persistent storage
    await addSavedStatusId(statusFile.id);

    // Clean up temp file if we created one
    if (uriToSave !== statusFile.uri && uriToSave.startsWith('file://')) {
      const tempPath = uriToSave.replace('file://', '');
      try {
        await RNFS.unlink(tempPath);
        console.log('🗑️ Cleaned up temp file');
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up temp file:', cleanupError);
      }
    }

    console.log('✅ Successfully saved to gallery');
    return true;
  } catch (error) {
    console.error('❌ Error saving to gallery:', error);
    return false;
  }
};

/**
 * Get saved status files from the device gallery's Status album
 */
export const getSavedStatusFiles = async (): Promise<StatusFile[]> => {
  try {
    console.log('📱 Loading saved statuses from gallery...');

    const photos = await CameraRoll.getPhotos({
      first: 1000,
      assetType: 'All',
      groupName: 'Status',
      include: ['filename', 'fileSize', 'imageSize'],
    });

    console.log(`📊 Found ${photos.edges.length} saved files in Status album`);

    const statusFiles: StatusFile[] = photos.edges.map((edge, index) => {
      const node = edge.node;
      const uri = node.image.uri;
      const filename = node.image.filename || `status_${index}`;
      const isVideo =
        node.type === 'video' || filename.toLowerCase().endsWith('.mp4');

      return {
        // Use filename as ID to match with saved status IDs from AsyncStorage
        id: filename,
        uri: uri,
        filename: filename,
        type: isVideo ? 'video' : 'image',
        timestamp: node.timestamp ? node.timestamp * 1000 : Date.now(),
        size: node.image.fileSize || 0,
        isSaved: true,
      };
    });

    // Sort by timestamp, newest first
    return statusFiles.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('❌ Error loading saved statuses from gallery:', error);
    return [];
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} min ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};
