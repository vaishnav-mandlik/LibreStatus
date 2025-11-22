import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { FolderPicker } = NativeModules;

const SAF_URI_KEY = 'whatsapp_status_folder_uri';

export interface FolderFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

/**
 * Request user to select the WhatsApp Status folder
 */
export const requestFolderAccess = async (
  type: 'whatsapp' | 'business',
): Promise<string | null> => {
  try {
    if (Platform.OS !== 'android' || !FolderPicker) {
      return null;
    }

    const packageName =
      type === 'business' ? 'com.whatsapp.w4b' : 'com.whatsapp';
    const uri = await FolderPicker.pickFolder(packageName);
    if (uri) {
      // Save the URI for future use
      await AsyncStorage.setItem(`${SAF_URI_KEY}_${type}`, uri);
      console.log('✅ Folder URI saved:', uri);
      return uri;
    }
    return null;
  } catch (error: any) {
    if (error.code !== 'CANCELLED') {
      console.error('❌ Error requesting folder access:', error);
    }
    return null;
  }
};

/**
 * Check if we have saved folder access
 */
export const hasFolderAccess = async (
  type: 'whatsapp' | 'business',
): Promise<string | null> => {
  try {
    const uri = await AsyncStorage.getItem(`${SAF_URI_KEY}_${type}`);
    if (uri) {
      console.log(`✅ Found saved folder URI for ${type}:`, uri);
      return uri;
    }
    return null;
  } catch (error) {
    console.error('❌ Error checking folder access:', error);
    return null;
  }
};

/**
 * List all files in the granted folder
 */
export const listFolderFiles = async (uri: string): Promise<FolderFile[]> => {
  try {
    if (!FolderPicker) {
      return [];
    }

    const files = await FolderPicker.listFiles(uri);
    console.log('📊 Files found via SAF:', files.length);
    return files;
  } catch (error) {
    console.error('❌ Error listing folder files:', error);
    return [];
  }
};

/**
 * Clear saved folder access
 */
export const clearFolderAccess = async (type: 'whatsapp' | 'business') => {
  try {
    await AsyncStorage.removeItem(`${SAF_URI_KEY}_${type}`);
    console.log(`✅ Cleared folder access for ${type}`);
  } catch (error) {
    console.error('❌ Error clearing folder access:', error);
  }
};
