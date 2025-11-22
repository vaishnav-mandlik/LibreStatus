package com.vaishnavmandlik.statussaverpro;

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

        // Try to open at the WhatsApp status folder directly
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                // Construct URI for the .Statuses folder
                // Format: content://com.android.externalstorage.documents/tree/primary%3AAndroid%2Fmedia%2Fcom.whatsapp%2FWhatsApp%2FMedia%2F.Statuses
                String path = "primary:Android/media/" + packageName + "/WhatsApp/Media/.Statuses";
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
            DocumentFile[] files = pickedDir.listFiles();

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
}
