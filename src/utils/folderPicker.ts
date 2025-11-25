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
      // Validate the URI by trying to list files
      try {
        const files = await FolderPicker.listFiles(uri);
        console.log(`✅ Validated folder with ${files.length} files`);
        
        // Save the URI if we can successfully call listFiles (even if 0 files)
        // The folder structure is valid if listFiles doesn't throw an error
        await AsyncStorage.setItem(`${SAF_URI_KEY}_${type}`, uri);
        console.log('✅ Folder URI saved:', uri);
        return uri;
      } catch (listError: any) {
        console.error('❌ Selected folder is invalid:', listError.message);
        // Only reject if the error indicates no .Statuses folder was found
        if (listError.message?.includes('Status folder not found')) {
          throw new Error('Invalid folder selected. Please select a folder containing WhatsApp status files (.Statuses folder).');
        }
        // For other errors, still save the URI and let it retry later
        await AsyncStorage.setItem(`${SAF_URI_KEY}_${type}`, uri);
        console.log('⚠️ Folder URI saved despite error (will retry later):', uri);
        return uri;
      }
    }
    return null;
  } catch (error: any) {
    if (error.code !== 'CANCELLED') {
      console.error('❌ Error requesting folder access:', error);
    }
    throw error;
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
export const listFolderFiles = async (
  uri: string,
  type?: 'whatsapp' | 'business'
): Promise<FolderFile[]> => {
  try {
    if (!FolderPicker) {
      return [];
    }

    const files = await FolderPicker.listFiles(uri);
    console.log('📊 Files found via SAF:', files.length);
    return files;
  } catch (error: any) {
    console.error('❌ Error listing folder files:', error);
    
    // Only clear the URI if the folder is completely inaccessible or doesn't exist
    // Don't clear if it's just that .Statuses folder is not found (user might need to select again)
    if (type && (error.message?.includes('no longer accessible') || error.message?.includes('Folder not found'))) {
      console.log('🗑️ Clearing inaccessible folder URI');
      await clearFolderAccess(type);
    }
    
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
