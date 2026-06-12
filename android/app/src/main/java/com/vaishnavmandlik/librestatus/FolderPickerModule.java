package com.vaishnavmandlik.librestatus;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import androidx.documentfile.provider.DocumentFile;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class FolderPickerModule extends ReactContextBaseJavaModule {
    private static final int PICK_FOLDER_REQUEST = 1001;
    private Promise folderPickerPromise;

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == PICK_FOLDER_REQUEST && folderPickerPromise != null) {
                if (resultCode == Activity.RESULT_OK && data != null) {
                    Uri treeUri = data.getData();
                    if (treeUri != null) {
                        // Take persistable URI permission
                        final int takeFlags = data.getFlags()
                                & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                        activity.getContentResolver().takePersistableUriPermission(treeUri, takeFlags);

                        folderPickerPromise.resolve(treeUri.toString());
                    } else {
                        folderPickerPromise.reject("ERROR", "No folder selected");
                    }
                } else {
                    folderPickerPromise.reject("CANCELLED", "User cancelled folder selection");
                }
                folderPickerPromise = null;
            }
        }
    };

    public FolderPickerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(activityEventListener);
    }

    @Override
    public String getName() {
        return "FolderPicker";
    }

    @ReactMethod
    public void pickFolder(String packageName, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("ERROR", "Activity not available");
            return;
        }

        folderPickerPromise = promise;

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);

        // Open at the media folder level instead of .Statuses
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                // Construct URI for the media folder (not .Statuses)
                // Format: content://com.android.externalstorage.documents/tree/primary%3AAndroid%2Fmedia
                String path = "primary:Android/media";
                Uri initialUri = DocumentsContract.buildDocumentUri(
                    "com.android.externalstorage.documents",
                    path
                );
                intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, initialUri);
            } catch (Exception e) {
                // Fallback to default if initial URI fails
                android.util.Log.e("FolderPicker", "Failed to set initial URI: " + e.getMessage());
            }
        }

        try {
            activity.startActivityForResult(intent, PICK_FOLDER_REQUEST);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to open folder picker: " + e.getMessage());
            folderPickerPromise = null;
        }
    }

    @ReactMethod
    public void listFiles(String uriString, Promise promise) {
        try {
            Uri treeUri = Uri.parse(uriString);
            DocumentFile pickedDir = DocumentFile.fromTreeUri(getReactApplicationContext(), treeUri);

            if (pickedDir == null || !pickedDir.exists()) {
                promise.reject("ERROR", "Folder not found or no longer accessible");
                return;
            }

            WritableArray filesArray = Arguments.createArray();
            
            // Navigate to the .Statuses folder within the granted media directory
            // Granted URI might be for media folder, need to find WhatsApp/.../Statuses
            DocumentFile statusFolder = findStatusFolder(pickedDir);
            
            if (statusFolder == null || !statusFolder.exists()) {
                promise.reject("ERROR", "Status folder not found. Please select the Android/media folder containing WhatsApp.");
                return;
            }

            DocumentFile[] files = statusFolder.listFiles();

            for (DocumentFile file : files) {
                if (file.isFile()) {
                    String name = file.getName();
                    String mimeType = file.getType();
                    
                    // Filter for media files
                    if (name != null && (name.endsWith(".jpg") || name.endsWith(".jpeg") || 
                        name.endsWith(".png") || name.endsWith(".mp4") || name.endsWith(".webp") ||
                        (mimeType != null && (mimeType.startsWith("image/") || mimeType.startsWith("video/"))))) {
                        
                        WritableMap fileMap = Arguments.createMap();
                        fileMap.putString("uri", file.getUri().toString());
                        fileMap.putString("name", name);
                        fileMap.putString("type", mimeType);
                        fileMap.putDouble("size", file.length());
                        fileMap.putDouble("lastModified", file.lastModified());
                        filesArray.pushMap(fileMap);
                    }
                }
            }

            promise.resolve(filesArray);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to list files: " + e.getMessage());
        }
    }

    private DocumentFile findStatusFolder(DocumentFile rootDir) {
        try {
            // First, check if the granted folder itself is already the .Statuses folder
            String dirName = rootDir.getName();
            if (dirName != null && dirName.equals(".Statuses")) {
                android.util.Log.d("FolderPicker", "Root folder is .Statuses");
                return rootDir;
            }
            
            // Check if .Statuses exists directly in this folder
            DocumentFile directStatus = rootDir.findFile(".Statuses");
            if (directStatus != null && directStatus.isDirectory()) {
                android.util.Log.d("FolderPicker", "Found .Statuses directly in root");
                return directStatus;
            }
            
            // Recursively search for .Statuses folder
            DocumentFile result = searchForStatusFolder(rootDir, 0, 4);
            if (result != null) {
                android.util.Log.d("FolderPicker", "Found .Statuses at: " + result.getUri());
                return result;
            }
            
        } catch (Exception e) {
            android.util.Log.e("FolderPicker", "Error finding status folder: " + e.getMessage());
        }
        
        return null;
    }
    
    private DocumentFile searchForStatusFolder(DocumentFile dir, int depth, int maxDepth) {
        if (depth > maxDepth || dir == null || !dir.isDirectory()) {
            return null;
        }
        
        try {
            DocumentFile[] files = dir.listFiles();
            if (files == null) {
                return null;
            }
            
            // First pass: check for .Statuses in current directory
            for (DocumentFile file : files) {
                if (file.isDirectory()) {
                    String name = file.getName();
                    if (name != null && name.equals(".Statuses")) {
                        return file;
                    }
                }
            }
            
            // Second pass: recursively search subdirectories
            for (DocumentFile file : files) {
                if (file.isDirectory()) {
                    DocumentFile result = searchForStatusFolder(file, depth + 1, maxDepth);
                    if (result != null) {
                        return result;
                    }
                }
            }
        } catch (Exception e) {
            android.util.Log.e("FolderPicker", "Error searching folder at depth " + depth + ": " + e.getMessage());
        }
        
        return null;
    }
}
