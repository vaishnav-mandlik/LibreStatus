package com.mandlik.statussaverpro;

import android.app.Activity;
import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.util.Log;
import android.view.Window;
import android.view.ViewGroup;
import android.view.View;
import android.os.Build;
import android.provider.DocumentsContract;
import android.view.WindowManager;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.documentfile.provider.DocumentFile;
import com.facebook.react.views.modal.ReactModalHostView;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import org.json.JSONObject;

import java.io.File;
import java.util.List;
import java.util.ArrayList;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;

public class FolderPickerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "FolderPicker";
    private static final int PICK_FOLDER_REQUEST = 1001;
    private static final int MAX_SEARCH_DEPTH = 4;

    /**
     * Ceiling on the directories one ".Statuses" hunt may open.
     *
     * The walk is depth-limited but was not breadth-limited, and it runs on the
     * single native-modules thread. Granting "Internal storage" instead of
     * Android/media — an easy thing to do in the system picker — therefore
     * walked the whole volume to depth 4 at one ContentResolver query per
     * directory: thousands of queries, minutes of a frozen bridge, and the Feed
     * sat on a spinner that never stopped because listFiles never returned.
     * Android/media holds a handful of directories, so this is far above any
     * healthy grant and only bites the folders that used to hang.
     */
    private static final int MAX_SEARCH_NODES = 400;

    private static final String THUMB_DIR = "thumbs";

    /**
     * Poster frames are drawn into tiles at most ~190dp wide, so a full 1080x2340
     * frame was ~35KB-1MB of JPEG on disk and a 10MB bitmap in memory for nothing.
     * Bounding the longer edge keeps a frame around 40-60KB and still looks sharp
     * on a 3x screen.
     */
    private static final int THUMB_MAX_EDGE = 640;
    private static final int THUMB_QUALITY = 80;
    private static final long DEFAULT_THUMB_CACHE_BYTES = 40L * 1024L * 1024L;

    /**
     * Frame extraction is slow and blocking, and @ReactMethod bodies run on the
     * single native-modules thread — a fast scroll used to queue dozens of
     * decodes there and stall every other bridge call behind them (listFiles,
     * copyDocument). Three workers matches the JS-side job queue.
     */
    private final ExecutorService thumbExecutor = Executors.newFixedThreadPool(3);

    /**
     * Where a file copy runs, so it is not the native-modules thread.
     *
     * Saving a 20 MB video off slow storage is a few hundred milliseconds of
     * blocking read-write. Done inline it owns the one thread every other
     * @ReactMethod has to queue on, so "save all" over a few dozen videos held
     * up listFiles and every thumbnail request behind it for seconds at a time.
     *
     * One thread, not a pool. Both callers already await each copy before
     * starting the next, so copies were serialised anyway; a single worker
     * keeps that exactly true rather than letting a batch suddenly run several
     * writes at once against the same storage.
     */
    private final ExecutorService copyExecutor = Executors.newSingleThreadExecutor();

    /**
     * Written from the JS thread in pickFolder and read from the UI thread in
     * onActivityResult, so it must be volatile. Guarded by `promiseLock` for
     * the compare-and-clear so a result can never settle a promise twice.
     */
    private volatile Promise folderPickerPromise;
    private final Object promiseLock = new Object();

    /**
     * Resolving ".Statuses" walks the granted tree with one ContentResolver
     * query per directory, which is slow enough to notice on every list load.
     * The result only changes when the user picks a different folder, so it is
     * cached per tree URI.
     *
     * Concurrent because it is written from the UI thread in onActivityResult
     * and read from the native-modules thread in listFiles; a plain HashMap
     * resized under that pair can lose an entry or spin.
     */
    private final Map<String, String> statusFolderCache = new ConcurrentHashMap<>();

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode != PICK_FOLDER_REQUEST) {
                return;
            }
            Promise promise;
            synchronized (promiseLock) {
                promise = folderPickerPromise;
                folderPickerPromise = null;
            }
            if (promise == null) {
                return;
            }

            if (resultCode != Activity.RESULT_OK || data == null) {
                promise.reject("CANCELLED", "User cancelled folder selection");
                return;
            }

            Uri treeUri = data.getData();
            if (treeUri == null) {
                promise.reject("ERROR", "No folder selected");
                return;
            }

            try {
                final int takeFlags = data.getFlags()
                        & Intent.FLAG_GRANT_READ_URI_PERMISSION;
                activity.getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
            } catch (SecurityException e) {
                // Without a persisted grant the URI dies with the process, so
                // this is a real failure rather than something to swallow.
                promise.reject("NO_PERSIST", "Could not persist folder access: " + e.getMessage());
                return;
            } catch (Exception e) {
                promise.reject("ERROR", "Could not take folder permission: " + e.getMessage());
                return;
            }

            // Both kinds may have resolved through this tree.
            statusFolderCache.keySet().removeIf(key -> key.endsWith("|" + treeUri));
            promise.resolve(treeUri.toString());
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

    /**
     * Exposes the real build identity to JS so the version string has exactly
     * one source. It used to be hardcoded in a dozen places, including once per
     * locale inside the translation table, and had already drifted.
     */
    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();
        constants.put("versionName", BuildConfig.VERSION_NAME);
        constants.put("versionCode", BuildConfig.VERSION_CODE);
        constants.put("applicationId", BuildConfig.APPLICATION_ID);
        return constants;
    }

    @Override
    public void invalidate() {
        getReactApplicationContext().removeActivityEventListener(activityEventListener);
        // Stops in-flight frame decodes from outliving the module and holding a
        // codec plus a bitmap for a screen that no longer exists.
        thumbExecutor.shutdownNow();
        /*
         * Teardown, so be accurate about what this does rather than hopeful.
         * A queued copy is discarded without running, so its promise never
         * settles; a running one is interrupted, but a read on a
         * ContentResolver stream does not answer an interrupt, so it most
         * likely finishes and resolves anyway. Neither is reachable by a user:
         * invalidate runs when the bridge is going away, so there is no JS
         * left to be waiting. The .part file either case leaves behind is
         * unlinked by copyInto the next time that destination is written.
         */
        copyExecutor.shutdownNow();
        synchronized (promiseLock) {
            if (folderPickerPromise != null) {
                folderPickerPromise.reject("CANCELLED", "Module torn down");
                folderPickerPromise = null;
            }
        }
        super.invalidate();
    }

    @ReactMethod
    public void pickFolder(String packageName, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("ERROR", "Activity not available");
            return;
        }

        synchronized (promiseLock) {
            if (folderPickerPromise != null) {
                // A previous request never got a result. Settle it rather than
                // leaking a promise that JS is still awaiting.
                folderPickerPromise.reject("SUPERSEDED", "Another folder request started");
            }
            folderPickerPromise = promise;
        }

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        // Read only. The app copies statuses out of this tree and never writes
        // into it, and the onboarding copy promises exactly that.
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);

        // Open the picker at Android/media, one level above the WhatsApp
        // package directory, because Android 11+ forbids granting Android/data
        // but still allows Android/media.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Uri initialUri = DocumentsContract.buildDocumentUri(
                        "com.android.externalstorage.documents",
                        "primary:Android/media"
                );
                intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, initialUri);
            } catch (Exception e) {
                android.util.Log.w("FolderPicker", "Could not set initial URI: " + e.getMessage());
            }
        }

        try {
            activity.startActivityForResult(intent, PICK_FOLDER_REQUEST);
        } catch (Exception e) {
            synchronized (promiseLock) {
                folderPickerPromise = null;
            }
            promise.reject("ERROR", "Failed to open folder picker: " + e.getMessage());
        }
    }

    @ReactMethod
    public void listFiles(String uriString, String kind, Promise promise) {
        try {
            java.util.List<DocumentFile> statusFolders = resolveStatusFolders(uriString, kind);
            if (statusFolders.isEmpty()) {
                if (!hasTreeAccess(uriString)) {
                    /*
                     * The picked folder itself is unreachable: the grant was
                     * revoked, or the directory was deleted or unmounted. JS
                     * has to drop the stored URI and offer the picker again,
                     * and it can only tell that apart from the everyday case
                     * below if the two are reported differently.
                     */
                    promise.reject("NO_ACCESS",
                            "Folder no longer accessible. Please select the folder again.");
                    return;
                }
                /*
                 * The tree is fine, ".Statuses" is simply not in it right now.
                 * WhatsApp creates that folder when a status is viewed and
                 * removes it when the last one expires, so this is the normal
                 * state of a healthy grant on a quiet day. JS keeps the grant
                 * and retries on the next listing.
                 */
                promise.reject("ERROR",
                        "Status folder not found. Please select the Android/media folder.");
                return;
            }

            WritableArray listed = Arguments.createArray();
            for (DocumentFile folder : statusFolders) {
                listChildrenInto(folder, listed);
            }
            /*
             * A grant revoked between the exists() check above and the query
             * makes the query throw and androidx's fallback swallow the same
             * exception into an empty list: an empty listing over a dead grant
             * looked like a quiet day and kept the grant. Only checked on the
             * empty path, so a healthy listing costs no extra query.
             */
            if (listed.size() == 0 && !hasTreeAccess(uriString)) {
                promise.reject("NO_ACCESS",
                        "Folder no longer accessible. Please select the folder again.");
                return;
            }
            promise.resolve(listed);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to list files: " + e.getMessage());
        }
    }

    /**
     * Every media file in the folder, from one provider query.
     *
     * The previous listing went through androidx: {@code listFiles()} and then
     * {@code isFile()}, {@code getName()}, {@code getType()}, {@code length()}
     * and {@code lastModified()} on each child. Each of those is its own
     * ContentResolver query — an IPC round trip into the documents provider —
     * so a folder of 120 statuses cost over 700 of them, one after another on
     * the native-modules thread, and took one to three seconds. The Feed's
     * first paint waits on this call, so that was most of what a cold start
     * felt like. The child-documents cursor answers all five columns for every
     * child in a single query.
     *
     * The rows are filtered exactly as the old loop filtered its files, and
     * the URIs are built the way {@code TreeDocumentFile} builds them, so the
     * ids JS keys everything on are byte-identical to before.
     */
    private void listChildrenInto(DocumentFile statusFolder, WritableArray out) {
        WritableArray part = listChildren(statusFolder);
        for (int i = 0; i < part.size(); i++) {
            out.pushMap(part.getMap(i));
        }
    }

    private WritableArray listChildren(DocumentFile statusFolder) {
        Uri folderUri = statusFolder.getUri();
        Cursor cursor = null;
        try {
            Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
                    folderUri, DocumentsContract.getDocumentId(folderUri));
            cursor = getReactApplicationContext().getContentResolver().query(
                    childrenUri,
                    new String[] {
                            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                            DocumentsContract.Document.COLUMN_MIME_TYPE,
                            DocumentsContract.Document.COLUMN_SIZE,
                            DocumentsContract.Document.COLUMN_LAST_MODIFIED,
                    },
                    null, null, null);
        } catch (Exception e) {
            cursor = null;
        }
        if (cursor == null) {
            // A provider that will not answer the bulk query still answers the
            // per-child ones; slow is better than empty.
            return listChildrenOneByOne(statusFolder);
        }

        WritableArray filesArray = Arguments.createArray();
        try {
            int idCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
            int nameCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
            int mimeCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE);
            int sizeCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_SIZE);
            int modCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED);
            if (idCol < 0 || nameCol < 0) {
                return listChildrenOneByOne(statusFolder);
            }

            while (cursor.moveToNext()) {
                String mimeType = mimeCol >= 0 && !cursor.isNull(mimeCol)
                        ? cursor.getString(mimeCol) : null;
                // What DocumentFile.isFile() excluded: directories, and entries
                // the provider gives no type for at all.
                if (mimeType == null || mimeType.isEmpty()
                        || DocumentsContract.Document.MIME_TYPE_DIR.equals(mimeType)) {
                    continue;
                }
                String name = cursor.getString(nameCol);
                if (name == null || name.startsWith(".")) {
                    continue;
                }
                if (!isMedia(name, mimeType)) {
                    continue;
                }
                long length = sizeCol >= 0 && !cursor.isNull(sizeCol) ? cursor.getLong(sizeCol) : 0;
                if (length < 1024) {
                    continue;
                }
                long modified = modCol >= 0 && !cursor.isNull(modCol) ? cursor.getLong(modCol) : 0;
                Uri childUri = DocumentsContract.buildDocumentUriUsingTree(
                        folderUri, cursor.getString(idCol));

                WritableMap fileMap = Arguments.createMap();
                fileMap.putString("uri", childUri.toString());
                fileMap.putString("name", name);
                fileMap.putString("type", mimeType);
                fileMap.putDouble("size", length);
                fileMap.putDouble("lastModified", modified);
                filesArray.pushMap(fileMap);
            }
        } finally {
            cursor.close();
        }
        return filesArray;
    }

    /** The original per-child listing, kept only as the fallback above. */
    private WritableArray listChildrenOneByOne(DocumentFile statusFolder) {
        WritableArray filesArray = Arguments.createArray();
        DocumentFile[] files = statusFolder.listFiles();

        for (DocumentFile file : files) {
            if (!file.isFile()) {
                continue;
            }
            String name = file.getName();
            if (name == null || name.startsWith(".")) {
                continue;
            }
            String mimeType = file.getType();
            if (!isMedia(name, mimeType)) {
                continue;
            }
            long length = file.length();
            if (length < 1024) {
                continue;
            }

            WritableMap fileMap = Arguments.createMap();
            fileMap.putString("uri", file.getUri().toString());
            fileMap.putString("name", name);
            fileMap.putString("type", mimeType == null ? "" : mimeType);
            fileMap.putDouble("size", length);
            fileMap.putDouble("lastModified", file.lastModified());
            filesArray.pushMap(fileMap);
        }
        return filesArray;
    }

    /**
     * Streams a document (typically a content:// SAF URI) to a filesystem path.
     *
     * This exists so JS never has to base64 a whole video through the bridge to
     * copy it, which used to spike memory by ~1.4x the file size on both sides.
     */
    @ReactMethod
    public void copyDocument(final String srcUri, final String destPath, final Promise promise) {
        /*
         * The guard matters as much as the thread. An exception escaping a
         * task handed to an ExecutorService kills its worker, and an
         * unhandled throwable on a bare thread takes the process with it, so
         * running this off the bridge without catching Throwable turned "one
         * save failed" into "the app died". OutOfMemoryError while copying a
         * large video on a 1 GB phone is the realistic way in.
         */
        copyExecutor.execute(
                () -> {
                    try {
                        copyDocumentBlocking(srcUri, destPath, promise);
                    } catch (Throwable t) {
                        try {
                            promise.reject("ERROR", "Copy failed: " + t);
                        } catch (Throwable ignored) {
                            // The bridge is gone, so there is nobody to tell.
                        }
                    }
                });
    }

    /** The copy itself. Always called on {@link #copyExecutor}. */
    private void copyDocumentBlocking(String srcUri, String destPath, Promise promise) {
        InputStream in = null;
        OutputStream out = null;
        try {
            Uri uri = Uri.parse(srcUri);
            in = getReactApplicationContext().getContentResolver().openInputStream(uri);
            if (in == null) {
                promise.reject("ERROR", "Could not open source: " + srcUri);
                return;
            }

            File dest = new File(destPath.replaceFirst("^file://", ""));
            File parent = dest.getParentFile();
            if (parent != null && !parent.exists() && !parent.mkdirs()) {
                promise.reject("ERROR", "Could not create directory: " + parent.getAbsolutePath());
                return;
            }

            out = new FileOutputStream(dest);
            byte[] buffer = new byte[64 * 1024];
            long total = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                total += read;
            }
            out.flush();
            promise.resolve((double) total);
        } catch (Exception e) {
            promise.reject("ERROR", "Copy failed: " + e.getMessage());
        } finally {
            closeQuietly(in);
            closeQuietly(out);
        }
    }

    /**
     * Extracts a poster frame from a video and caches it as a JPEG.
     *
     * React Native's <Image> cannot decode a video, so without this every video
     * tile in the grid renders as an empty box.
     *
     * Kept as its own method because JS callers only ever want the path, and
     * because an older JS bundle may still call it. Resolves to a file:// path,
     * or null when the frame cannot be read (a codec the device cannot open,
     * for instance) so JS can fall back to a placeholder.
     */
    @ReactMethod
    public void getVideoThumbnail(final String srcUri, final String cacheKey, final Promise promise) {
        submitMetaJob(srcUri, cacheKey, promise, false);
    }

    /**
     * Poster frame plus the numbers JS cannot get anywhere else.
     *
     * Files listed through the Storage Access Framework carry no duration, so
     * video tiles had no duration pill even though the design always shows one.
     * The retriever is already open for the frame, so reading duration and size
     * from it is nearly free; both are cached in a JSON sidecar beside the JPEG
     * so a second call never re-opens the file.
     *
     * Resolves a map of { thumbnail, durationMs, width, height } — any field may
     * be null — or null when nothing at all could be read.
     */
    @ReactMethod
    public void getVideoMeta(final String srcUri, final String cacheKey, final Promise promise) {
        submitMetaJob(srcUri, cacheKey, promise, true);
    }

    private void submitMetaJob(final String srcUri, final String cacheKey,
                               final Promise promise, final boolean withMetadata) {
        try {
            thumbExecutor.execute(new Runnable() {
                @Override
                public void run() {
                    VideoMeta meta;
                    try {
                        meta = readVideoMeta(srcUri, cacheKey);
                    } catch (Throwable t) {
                        /*
                         * readVideoMeta only catches Exception, and the bitmap
                         * work in it throws OutOfMemoryError, which is an Error.
                         * That escaped, killed the worker, and left this promise
                         * unsettled forever. JS awaits it while holding one of
                         * only three concurrency slots and releases the slot in a
                         * finally that therefore never ran, so three of these
                         * wedged the whole poster-frame queue: every video tile
                         * in the grid stayed blank for the rest of the session.
                         * A missing poster is cosmetic; a stuck queue is not.
                         */
                        meta = null;
                    }
                    try {
                        if (!withMetadata) {
                            promise.resolve(meta == null ? null : meta.thumbnail);
                            return;
                        }
                        if (meta == null) {
                            promise.resolve(null);
                            return;
                        }
                        WritableMap map = Arguments.createMap();
                        if (meta.thumbnail == null) {
                            map.putNull("thumbnail");
                        } else {
                            map.putString("thumbnail", meta.thumbnail);
                        }
                        putPositive(map, "durationMs", meta.durationMs);
                        putPositive(map, "width", meta.width);
                        putPositive(map, "height", meta.height);
                        promise.resolve(map);
                    } catch (Throwable t) {
                        // The bridge is gone. Nothing left to report to, and
                        // rethrowing would only take the worker with it.
                        android.util.Log.w("FolderPicker",
                                "Could not settle poster request: " + t);
                    }
                }
            });
        } catch (RejectedExecutionException e) {
            // Module torn down mid-scroll. A poster is cosmetic, so settle the
            // promise rather than leaving JS awaiting forever.
            promise.resolve(null);
        }
    }

    /** Poster path and frame metadata, all fields optional. */
    private static final class VideoMeta {
        String thumbnail;
        long durationMs;
        int width;
        int height;
    }

    private static void putPositive(WritableMap map, String key, double value) {
        if (value > 0) {
            map.putDouble(key, value);
        } else {
            map.putNull(key);
        }
    }

    /**
     * The cache-aware read. Runs on a worker thread, never throws.
     *
     * Three paths, cheapest first: JPEG plus sidecar on disk (no file opened),
     * JPEG without sidecar (metadata only, no frame decoded), nothing cached
     * (decode a bounded frame and write both).
     */
    private VideoMeta readVideoMeta(String srcUri, String cacheKey) {
        File dir = new File(getReactApplicationContext().getCacheDir(), THUMB_DIR);
        if (!dir.exists() && !dir.mkdirs() && !dir.isDirectory()) {
            /*
             * The isDirectory re-check is what makes this safe under the three
             * workers, which all reach here at once on a fresh install: mkdirs
             * returns false to the two that lost the race even though the
             * directory now exists, so both used to answer null. JS memoises a
             * null for the whole session, so those two video tiles were blank
             * on first launch and stayed blank.
             */
            return null;
        }
        String key = sanitize(cacheKey);
        File dest = new File(dir, key + ".jpg");
        File sidecar = new File(dir, key + ".json");
        String cachedPath = dest.exists() && dest.length() > 0
                ? "file://" + dest.getAbsolutePath()
                : null;

        if (cachedPath != null) {
            VideoMeta cached = readSidecar(sidecar);
            if (cached != null) {
                cached.thumbnail = cachedPath;
                // Touch it so trimThumbnailCache evicts frames nobody looks at
                // rather than the ones the user scrolls past every day.
                dest.setLastModified(System.currentTimeMillis());
                return cached;
            }
        }

        MediaMetadataRetriever retriever = null;
        VideoMeta meta = new VideoMeta();
        meta.thumbnail = cachedPath;
        try {
            retriever = new MediaMetadataRetriever();
            Uri uri = Uri.parse(srcUri);
            if ("file".equals(uri.getScheme()) || srcUri.startsWith("/")) {
                retriever.setDataSource(srcUri.replaceFirst("^file://", ""));
            } else {
                retriever.setDataSource(getReactApplicationContext(), uri);
            }

            meta.durationMs = parseLong(retriever.extractMetadata(
                    MediaMetadataRetriever.METADATA_KEY_DURATION));
            int width = parseInt(retriever.extractMetadata(
                    MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));
            int height = parseInt(retriever.extractMetadata(
                    MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
            int rotation = parseInt(retriever.extractMetadata(
                    MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));
            if (rotation == 90 || rotation == 270) {
                // The retriever hands back display-oriented frames, so report
                // (and target) the displayed size, not the coded one.
                int swap = width;
                width = height;
                height = swap;
            }
            meta.width = width;
            meta.height = height;

            if (meta.thumbnail == null) {
                Bitmap frame = decodeBoundedFrame(retriever, width, height);
                if (frame != null && writeJpeg(frame, dest)) {
                    meta.thumbnail = "file://" + dest.getAbsolutePath();
                }
            }

            writeSidecar(sidecar, meta);
            return meta;
        } catch (Exception e) {
            // Unreadable codec or a revoked SAF grant. Hand back whatever we
            // have; the caller treats a null poster as "show the empty well".
            return meta.thumbnail == null && meta.durationMs <= 0 ? null : meta;
        } finally {
            if (retriever != null) {
                try {
                    retriever.release();
                } catch (Exception ignored) {
                    // Nothing actionable.
                }
            }
        }
    }

    /**
     * Grabs the first frame at no more than THUMB_MAX_EDGE on its longer side.
     *
     * getScaledFrameAtTime (API 27+) decodes straight to the target size, which
     * skips allocating the full-resolution bitmap entirely; below that, and when
     * the frame size is unknown, we scale down after the fact instead.
     */
    private static Bitmap decodeBoundedFrame(MediaMetadataRetriever retriever, int width, int height) {
        Bitmap frame = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1 && width > 0 && height > 0) {
            float scale = Math.min(1f, (float) THUMB_MAX_EDGE / Math.max(width, height));
            int dstWidth = Math.max(1, Math.round(width * scale));
            int dstHeight = Math.max(1, Math.round(height * scale));
            try {
                frame = retriever.getScaledFrameAtTime(
                        0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, dstWidth, dstHeight);
            } catch (Exception ignored) {
                // Some devices throw on unusual codecs; fall through.
            }
        }
        if (frame == null) {
            frame = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
        }
        if (frame == null) {
            return null;
        }

        int longest = Math.max(frame.getWidth(), frame.getHeight());
        if (longest <= THUMB_MAX_EDGE) {
            return frame;
        }
        float scale = (float) THUMB_MAX_EDGE / longest;
        Bitmap scaled = Bitmap.createScaledBitmap(
                frame,
                Math.max(1, Math.round(frame.getWidth() * scale)),
                Math.max(1, Math.round(frame.getHeight() * scale)),
                true);
        if (scaled != frame) {
            frame.recycle();
        }
        return scaled;
    }

    /** Compresses to a temp name and renames in, then recycles the bitmap. */
    private static boolean writeJpeg(Bitmap bitmap, File dest) {
        // Unique per job: two workers for one key (a cache clear mid-render lets
        // that happen) used to truncate each other's stream and rename the
        // interleaved bytes into place as the real JPEG.
        File partial = new File(dest.getAbsolutePath() + "." + System.nanoTime() + ".part");
        FileOutputStream out = null;
        try {
            out = new FileOutputStream(partial);
            boolean ok = bitmap.compress(Bitmap.CompressFormat.JPEG, THUMB_QUALITY, out);
            out.flush();
            out.close();
            out = null;
            // A process killed mid-compress used to leave a truncated JPEG under
            // the real name, which the cache-hit path then served forever.
            return ok && partial.renameTo(dest);
        } catch (Exception e) {
            return false;
        } finally {
            closeQuietly(out);
            bitmap.recycle();
            if (partial.exists()) {
                partial.delete();
            }
        }
    }

    private static VideoMeta readSidecar(File file) {
        if (!file.exists() || file.length() == 0 || file.length() > 4096) {
            return null;
        }
        FileInputStream in = null;
        try {
            byte[] buffer = new byte[(int) file.length()];
            in = new FileInputStream(file);
            int read = in.read(buffer);
            if (read <= 0) {
                return null;
            }
            JSONObject json = new JSONObject(new String(buffer, 0, read, "UTF-8"));
            VideoMeta meta = new VideoMeta();
            meta.durationMs = json.optLong("durationMs", 0);
            meta.width = json.optInt("width", 0);
            meta.height = json.optInt("height", 0);
            return meta;
        } catch (Exception e) {
            // Truncated or hand-edited sidecar: treat it as absent.
            return null;
        } finally {
            closeQuietly(in);
        }
    }

    private static void writeSidecar(File file, VideoMeta meta) {
        FileOutputStream out = null;
        try {
            JSONObject json = new JSONObject();
            json.put("durationMs", meta.durationMs);
            json.put("width", meta.width);
            json.put("height", meta.height);
            out = new FileOutputStream(file);
            out.write(json.toString().getBytes("UTF-8"));
            out.flush();
        } catch (Exception ignored) {
            // The sidecar is a cache; losing it only costs one metadata read.
        } finally {
            closeQuietly(out);
        }
    }

    private static long parseLong(String value) {
        try {
            return value == null ? 0L : Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private static int parseInt(String value) {
        try {
            return value == null ? 0 : Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** Deletes every cached poster frame. Returns bytes reclaimed. */
    @ReactMethod
    public void clearThumbnailCache(Promise promise) {
        long freed = 0;
        try {
            File dir = new File(getReactApplicationContext().getCacheDir(), THUMB_DIR);
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) {
                    long size = f.length();
                    if (f.delete()) {
                        freed += size;
                    }
                }
            }
        } catch (Exception ignored) {
            // Report whatever was freed before the failure.
        }
        promise.resolve((double) freed);
    }

    /**
     * Evicts the oldest poster frames until the cache fits in maxBytes.
     *
     * Nothing used to bound this directory: a status folder that churns daily
     * left frames for videos that no longer exist, and the app's cache grew
     * without limit. Called once at boot. Returns bytes reclaimed.
     */
    @ReactMethod
    public void trimThumbnailCache(double maxBytes, Promise promise) {
        long freed = 0;
        try {
            File dir = new File(getReactApplicationContext().getCacheDir(), THUMB_DIR);
            File[] files = dir.listFiles();
            if (files != null && files.length > 0) {
                long total = 0;
                for (File f : files) {
                    total += f.length();
                }
                long cap = maxBytes > 0 ? (long) maxBytes : DEFAULT_THUMB_CACHE_BYTES;
                if (total > cap) {
                    Arrays.sort(files, new Comparator<File>() {
                        @Override
                        public int compare(File a, File b) {
                            return Long.compare(a.lastModified(), b.lastModified());
                        }
                    });
                    for (File f : files) {
                        if (total <= cap) {
                            break;
                        }
                        long size = f.length();
                        if (f.delete()) {
                            total -= size;
                            freed += size;
                        }
                        // Drop the metadata sidecar with its frame, or orphans
                        // would accumulate and never be counted against the cap.
                        String name = f.getName();
                        if (name.endsWith(".jpg")) {
                            File sidecar = new File(dir,
                                    name.substring(0, name.length() - 4) + ".json");
                            long sidecarSize = sidecar.length();
                            if (sidecar.exists() && sidecar.delete()) {
                                total -= sidecarSize;
                                freed += sidecarSize;
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // Report whatever was freed before the failure.
        }
        promise.resolve((double) freed);
    }

    private static String sanitize(String key) {
        return key.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    /**
     * Toggles FLAG_SECURE, which blanks the app's thumbnail in the recents
     * switcher and blocks screenshots. Must run on the UI thread.
     */
    @ReactMethod
    public void setSecureFlag(final boolean enabled, final Promise promise) {
        final Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("ERROR", "Activity not available");
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                boolean applied;
                try {
                    if (enabled) {
                        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    } else {
                        activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    }
                    applied = true;
                } catch (Exception e) {
                    android.util.Log.w("FolderPicker", "setSecureFlag failed: " + e.getMessage());
                    applied = false;
                }
                /*
                 * Settled here, from the outcome, rather than optimistically
                 * before the runnable had run: the Hide-from-recents switch
                 * takes this answer as the truth and reverts itself when it is
                 * false, so reporting success for a window that refused the
                 * flag left the switch promising a blank recents preview the
                 * app did not have.
                 */
                promise.resolve(applied);
            }
        });
    }

    /**
     * Holds the screen on while a video plays in the viewer.
     *
     * FLAG_KEEP_SCREEN_ON rather than a wake lock: it needs no permission and
     * the system drops it with the window, so a crash cannot leave the screen
     * pinned awake. Must run on the UI thread.
     */
    @ReactMethod
    public void setKeepAwake(final boolean enabled, final Promise promise) {
        final Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.resolve(false);
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                boolean applied;
                try {
                    if (enabled) {
                        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    } else {
                        activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    }
                    applied = true;
                } catch (Exception e) {
                    android.util.Log.w("FolderPicker", "setKeepAwake failed: " + e.getMessage());
                    applied = false;
                }
                // Same reason as setSecureFlag: the answer is the outcome, not
                // "the call was accepted".
                promise.resolve(applied);
            }
        });
    }

    /**
     * Shows a folder on the primary volume in the system Files app.
     *
     * The Tools screen points at the save album. The SAF picker cannot open a
     * folder for browsing, so this fires a plain VIEW on the folder's document
     * URI instead. Resolves false, not an error, when nothing handles it, so
     * JS can fall back to a hint rather than a failure toast.
     */
    @ReactMethod
    public void openFolder(String relativePath, Promise promise) {
        try {
            Uri folder = DocumentsContract.buildDocumentUri(
                    "com.android.externalstorage.documents",
                    "primary:" + relativePath
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(folder, "vnd.android.document/directory");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Activity activity = getCurrentActivity();
            Context context = activity != null ? activity : getReactApplicationContext();
            context.startActivity(intent);
            promise.resolve(true);
        } catch (ActivityNotFoundException e) {
            promise.resolve(false);
        } catch (Exception e) {
            promise.reject("ERROR", "Could not open folder: " + e.getMessage());
        }
    }

    /**
     * Hands one staged file straight to an app — the viewer's Repost.
     *
     * An explicit ACTION_SEND to the app's share activity, with the file
     * behind this app's own FileProvider. Two things forced the explicit
     * component: react-native-share's shareSingle wrapped the targeted intent
     * in a chooser carrying an intent-sender, and WhatsApp lists its share
     * activity twice for ACTION_SEND, so even a package-scoped implicit intent
     * lands in the system resolver. Android 16's intent-redirect hardening
     * throws a SecurityException inside that resolver, and WhatsApp opened
     * with nothing attached. Resolves false when the app has no share
     * activity (it is not installed), so JS can say so rather than fail.
     */
    @ReactMethod
    public void shareFileTo(String path, String mime, String packageName, Promise promise) {
        try {
            File file = new File(path);
            if (!file.exists()) {
                promise.reject("ENOENT", "Nothing to share at " + path);
                return;
            }
            Activity activity = getCurrentActivity();
            Context context = activity != null ? activity : getReactApplicationContext();
            Uri uri = FileProvider.getUriForFile(
                    context, context.getPackageName() + ".share", file);

            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            // The grant travels with ClipData on modern Android; EXTRA_STREAM
            // alone is not enough for every receiver.
            send.setClipData(ClipData.newRawUri(null, uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (packageName != null && !packageName.isEmpty()) {
                send.setPackage(packageName);
                ResolveInfo target = null;
                for (ResolveInfo info : context.getPackageManager().queryIntentActivities(send, 0)) {
                    if (info.activityInfo != null
                            && packageName.equals(info.activityInfo.packageName)) {
                        target = info;
                        break;
                    }
                }
                if (target == null) {
                    Log.w(TAG, "shareFileTo: " + packageName + " has no activity for " + mime);
                    promise.resolve(false);
                    return;
                }
                // Explicit, so no resolver or chooser sits between us and it.
                send.setComponent(new ComponentName(
                        target.activityInfo.packageName, target.activityInfo.name));
            }
            if (activity == null) {
                send.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            }
            context.startActivity(send);
            promise.resolve(true);
        } catch (ActivityNotFoundException e) {
            Log.w(TAG, "shareFileTo: nothing handles the intent for " + packageName);
            promise.resolve(false);
        } catch (Exception e) {
            // Left in the log on purpose: JS shows one line to the user, and
            // `adb logcat -s FolderPicker` is how a field report gets a cause.
            Log.w(TAG, "shareFileTo failed for " + path, e);
            promise.reject("ERROR", "Could not share: " + e.getMessage());
        }
    }

    /**
     * Opens an app on its launcher activity — the Feed's "Open WhatsApp".
     *
     * Not a deep link: `whatsapp://send` with nothing to send lands on a
     * contact picker that finishes itself at once, so the button looked like
     * it did nothing. Resolves false when the package has no launcher (it is
     * not installed) so JS can say so.
     */
    @ReactMethod
    public void openApp(String packageName, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch == null) {
                promise.resolve(false);
                return;
            }
            Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivity(launch);
            } else {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(launch);
            }
            promise.resolve(true);
        } catch (ActivityNotFoundException e) {
            promise.resolve(false);
        } catch (Exception e) {
            Log.w(TAG, "openApp failed for " + packageName, e);
            promise.reject("ERROR", "Could not open app: " + e.getMessage());
        }
    }

    /**
     * Dark or light icons in the status and navigation bars, and the colour
     * painted behind them where Android still paints one.
     *
     * The XML attributes can only be qualified by the system's night mode, so
     * a user reading in Light on a phone set to Dark (or the reverse) got the
     * wrong icons: a black gesture handle on a near-black tab bar. Only the
     * app knows which theme it settled on, so the app says.
     *
     * Every React Native Modal is its own window. RN copies the activity's
     * status-bar appearance into a new dialog exactly once, and sets the
     * dialog's navigation-bar appearance from the SYSTEM night mode on every
     * property update, so the activity window alone is not enough: the
     * viewer (dark ground in both themes) had a black gesture handle on
     * #060607 in Light. Every open Modal's window is found through the
     * activity's view tree and told the same thing.
     */
    @ReactMethod
    public void setSystemBars(final boolean light, final String color,
            final boolean statusLight, final String statusColor, Promise promise) {
        final Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.resolve(false);
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Integer parsed = parseColour(color);
                    Integer statusParsed = parseColour(statusColor);
                    Window activityWindow = activity.getWindow();
                    applyBars(activityWindow, statusLight, statusParsed, light, parsed);
                    List<Window> dialogs = new ArrayList<>();
                    collectDialogWindows(activityWindow.getDecorView(), dialogs);
                    for (Window dialogWindow : dialogs) {
                        // Dialog bars are translucent, so only the icons matter there.
                        // A Modal is a full-screen window with transparent
                        // bars, so its appearance is the one that shows; it
                        // has to be told the status bar's, not the navigation
                        // bar's, or a sheet over the green header flips the
                        // clock and battery dark for as long as it is open.
                        applyBars(dialogWindow, statusLight, null, light, null);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "setSystemBars failed", e);
                }
            }
        });
        promise.resolve(true);
    }

    /** A colour Android understands, or null to leave the paint alone. */
    private static Integer parseColour(String colour) {
        if (colour == null || colour.isEmpty()) {
            return null;
        }
        try {
            return Color.parseColor(colour);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    /**
     * The status bar and the navigation bar are set separately because a
     * screen's top and bottom need not match: the light theme's Feed has a
     * green header under white status icons and a white tab bar over dark
     * navigation icons.
     */
    @SuppressWarnings("deprecation")
    private static void applyBars(Window window, boolean statusLight, Integer statusColor,
            boolean light, Integer color) {
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(statusLight);
        controller.setAppearanceLightNavigationBars(light);
        // Android 15 draws edge to edge and ignores these, which is fine: the
        // app's own surfaces sit under the bars there.
        if (statusColor != null && Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(statusColor);
        }
        if (color != null && Build.VERSION.SDK_INT < 35) {
            /*
             * The navigation bar only gets the app's colour where the icons
             * over it can be darkened to match, and that is API 26 at runtime:
             * AndroidX picks WindowInsetsControllerCompat.Impl26 from 26 up, and
             * that is where setAppearanceLightNavigationBars above takes effect.
             * Below it, a light colour here would leave white buttons on
             * near-white for the rest of the session, so the bar stays black.
             *
             * Not 27. The theme's android:windowLightNavigationBar is API 27,
             * which is why values-v27/styles.xml exists, but the runtime flag
             * is one release older. Using 27 here painted Android 8.0's bar
             * black while the call above had already set dark buttons on it.
             * The status bar has no such split: windowLightStatusBar is API 23.
             */
            if (Build.VERSION.SDK_INT >= 26) {
                window.setNavigationBarColor(color);
            } else {
                window.setNavigationBarColor(Color.BLACK);
            }
        }
    }

    /** Every open React Native Modal's window, found through its host view. */
    private static void collectDialogWindows(View view, List<Window> out) {
        if (view instanceof ReactModalHostView) {
            Dialog dialog = ((ReactModalHostView) view).getDialog();
            if (dialog != null && dialog.getWindow() != null) {
                out.add(dialog.getWindow());
            }
        }
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                collectDialogWindows(group.getChildAt(i), out);
            }
        }
    }

    /** Whether a package is installed; the manifest's <queries> makes this answerable. */
    @ReactMethod
    public void isPackageInstalled(String packageName, Promise promise) {
        try {
            getReactApplicationContext().getPackageManager().getPackageInfo(packageName, 0);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    private static void closeQuietly(java.io.Closeable c) {
        if (c != null) {
            try {
                c.close();
            } catch (Exception ignored) {
                // Nothing actionable.
            }
        }
    }

    private static boolean isMedia(String name, String mimeType) {
        if (mimeType != null && (mimeType.startsWith("image/") || mimeType.startsWith("video/"))) {
            return true;
        }
        String lower = name.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")
                || lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".bmp")
                || lower.endsWith(".heic") || lower.endsWith(".mp4") || lower.endsWith(".3gp")
                || lower.endsWith(".mkv") || lower.endsWith(".mov") || lower.endsWith(".webm");
    }

    /**
     * Whether the picked tree itself still resolves.
     *
     * androidx swallows the SecurityException a revoked grant throws and
     * answers "does not exist", so a dead grant and a missing ".Statuses"
     * looked identical from JS — one message for a state that must send the
     * user back to the picker and a state that must leave the grant alone.
     * Only asked on the failure path, so a healthy listing still costs one
     * query.
     */
    /**
     * Whether the app still holds the folder the user picked.
     *
     * exists() returning false on the picked tree has two causes, and only
     * one of them is lost access. A revoked grant makes androidx swallow the
     * SecurityException and answer "does not exist". So does a documents
     * provider that is being restarted after the system killed it, which on a
     * 1 GB phone is routine. Treating the second as the first told JS the
     * grant was dead, JS deleted the stored folder, and the user was sent
     * back to pick the folder they had never lost.
     *
     * So the grant itself decides. While Android still lists it among the
     * app's persisted permissions, access is not lost: listFiles reports the
     * everyday "not found right now", JS keeps the folder, and the next
     * listing, by which time the provider is back, reads it normally. Only a
     * grant that is no longer persisted is reported as gone. The same rule
     * keeps a picked folder on removable storage that is briefly unmounted.
     */
    private boolean hasTreeAccess(String uriString) {
        Uri tree = Uri.parse(uriString);
        try {
            DocumentFile picked = DocumentFile.fromTreeUri(getReactApplicationContext(), tree);
            if (picked != null && picked.exists()) {
                return true;
            }
        } catch (Exception ignored) {
            // Decided by the grant below.
        }
        return holdsPersistedRead(tree);
    }

    /** Whether Android still lists a persisted read grant for exactly this tree. */
    private boolean holdsPersistedRead(Uri tree) {
        try {
            for (android.content.UriPermission grant : getReactApplicationContext()
                    .getContentResolver().getPersistedUriPermissions()) {
                if (grant.isReadPermission() && tree.equals(grant.getUri())) {
                    return true;
                }
            }
        } catch (Exception e) {
            android.util.Log.w("FolderPicker", "getPersistedUriPermissions: " + e.getMessage());
        }
        return false;
    }

    /**
     * Resolves and caches the .Statuses DocumentFile for a granted tree URI.
     *
     * Keyed by kind as well as tree: WhatsApp and WhatsApp Business are both
     * granted through Android/media, the byte-identical tree URI, and a cache
     * keyed on the tree alone handed both kinds whichever .Statuses had been
     * found first.
     */
    /**
     * Every ".Statuses" folder the grant reaches, WhatsApp's and WhatsApp
     * Business's alike, the requested kind's first. One grant of Android/media
     * covers both apps, and a phone with only WhatsApp Business installed used
     * to come up empty because the walk looked for com.whatsapp alone.
     */
    private java.util.List<DocumentFile> resolveStatusFolders(String uriString, String kind) {
        String key = kindKey(kind) + "|" + uriString;
        java.util.List<DocumentFile> out = new java.util.ArrayList<>();
        String cached = statusFolderCache.get(key);
        if (cached != null) {
            for (String one : cached.split("\n")) {
                if (one.isEmpty()) {
                    continue;
                }
                DocumentFile hit = DocumentFile.fromTreeUri(getReactApplicationContext(), Uri.parse(one));
                if (hit != null && hit.exists()) {
                    out.add(hit);
                }
            }
            if (!out.isEmpty()) {
                return out;
            }
            statusFolderCache.remove(key);
        }

        Uri treeUri = Uri.parse(uriString);
        DocumentFile pickedDir = DocumentFile.fromTreeUri(getReactApplicationContext(), treeUri);
        if (pickedDir == null || !pickedDir.exists()) {
            return out;
        }

        out.addAll(findStatusFolders(pickedDir, kindKey(kind)));
        if (!out.isEmpty()) {
            StringBuilder joined = new StringBuilder();
            for (DocumentFile f : out) {
                if (joined.length() > 0) {
                    joined.append('\n');
                }
                joined.append(f.getUri().toString());
            }
            statusFolderCache.put(key, joined.toString());
        }
        return out;
    }

    private static String kindKey(String kind) {
        return "business".equals(kind) ? "business" : "whatsapp";
    }

    private static final String[] DIR_PROJECTION = {
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
    };

    /**
     * The child directories of {@code dir}, in one provider query.
     *
     * androidx answers listFiles() with one query and then getName() and
     * isDirectory() with one more each, so walking a directory cost 2n+1
     * queries; this costs one. Files are skipped: the hunt only ever wants
     * directories.
     */
    private java.util.List<DocumentFile> childDirs(DocumentFile dir, java.util.List<String> namesOut) {
        java.util.List<DocumentFile> out = new java.util.ArrayList<>();
        Uri parent = dir.getUri();
        Cursor cursor = null;
        try {
            Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(
                    parent, DocumentsContract.getDocumentId(parent));
            cursor = getReactApplicationContext().getContentResolver()
                    .query(children, DIR_PROJECTION, null, null, null);
            if (cursor == null) {
                return out;
            }
            int idCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
            int nameCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
            int mimeCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE);
            if (idCol < 0 || nameCol < 0 || mimeCol < 0) {
                return out;
            }
            while (cursor.moveToNext()) {
                if (!DocumentsContract.Document.MIME_TYPE_DIR.equals(cursor.getString(mimeCol))) {
                    continue;
                }
                String name = cursor.getString(nameCol);
                if (name == null) {
                    continue;
                }
                DocumentFile child = DocumentFile.fromTreeUri(getReactApplicationContext(),
                        DocumentsContract.buildDocumentUriUsingTree(parent, cursor.getString(idCol)));
                if (child != null) {
                    out.add(child);
                    namesOut.add(name);
                }
            }
        } catch (Exception e) {
            android.util.Log.w("FolderPicker", "childDirs: " + e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return out;
    }

    /**
     * The child directory of {@code dir} named {@code name}, or null.
     *
     * At most one provider query per directory per search. Every route in
     * findStatusFolders starts at the granted folder, and the layouts overlap
     * on purpose — that overlap is what lets one Android/media grant cover
     * both apps — so the granted folder used to be listed six times over for a
     * cursor that came back identical each time. {@code seen} collapses that
     * to one.
     *
     * The cache lives for a single search and no longer. A folder can gain a
     * status while the app is open, and a listing that outlived the call would
     * hide it until the process restarted.
     */
    private DocumentFile childDir(
            DocumentFile dir,
            String name,
            java.util.Map<String, java.util.Map<String, DocumentFile>> seen) {
        String key = dir.getUri().toString();
        java.util.Map<String, DocumentFile> listing = seen.get(key);
        if (listing == null) {
            java.util.List<String> names = new java.util.ArrayList<>();
            java.util.List<DocumentFile> dirs = childDirs(dir, names);
            listing = new java.util.HashMap<>();
            for (int i = 0; i < dirs.size(); i++) {
                // SAF allows two children to share a display name. The scan
                // took the first match, so this keeps the first as well.
                if (!listing.containsKey(names.get(i))) {
                    listing.put(names.get(i), dirs.get(i));
                }
            }
            /*
             * Only remember a listing that actually came back. childDirs
             * returns an empty list both for a directory with no subfolders
             * and for a query that failed, and a null cursor is exactly what
             * a documents provider gives while it is being restarted after
             * the system killed it, which on a 1 GB phone is routine. Caching
             * that as "empty" made one transient failure answer every later
             * route in the same search, so the scan gave up and the Feed came
             * back empty. Retrying an empty directory costs one query, which
             * is what the code did before the cache existed.
             */
            if (!listing.isEmpty()) {
                seen.put(key, listing);
            }
        }
        return listing.get(name);
    }

    /**
     * Where WhatsApp keeps its statuses, found along the known layout first.
     *
     * The picker opens on Android/media and the copy tells the user to grant
     * that folder, so nearly every grant is Android/media, com.whatsapp*, the
     * app folder, or Media. Each hop below is one provider query, and on a
     * quiet day — WhatsApp removes .Statuses when the last status expires —
     * reaching Media and finding no .Statuses in it is the answer: the walk
     * stops there instead of crawling every sibling. The old search did
     * exactly that crawl, at three queries a child, so a quiet day with a
     * large WhatsApp Images folder cost tens of seconds on the native-modules
     * thread on every listing. The bounded search below remains for a grant
     * that is none of the known folders, skipping the other kind's package.
     */
    private java.util.List<DocumentFile> findStatusFolders(DocumentFile rootDir, String kind) {
        java.util.List<DocumentFile> found = new java.util.ArrayList<>();
        // One listing per directory for the length of this search; see childDir.
        java.util.Map<String, java.util.Map<String, DocumentFile>> seen =
                new java.util.HashMap<>();
        try {
            String dirName = rootDir.getName();
            if (dirName != null && dirName.equals(".Statuses")) {
                found.add(rootDir);
                return found;
            }
            boolean business = "business".equals(kind);
            String[] pkgs = business
                    ? new String[] {"com.whatsapp.w4b", "com.whatsapp"}
                    : new String[] {"com.whatsapp", "com.whatsapp.w4b"};
            String[] apps = business
                    ? new String[] {"WhatsApp Business", "WhatsApp"}
                    : new String[] {"WhatsApp", "WhatsApp Business"};

            /*
             * The picker opens on Android/media and the copy tells the user to
             * grant that folder, so nearly every grant is Android/media, a
             * package folder, the app folder, or Media itself. Each hop is one
             * provider query. Both apps are walked: a single Android/media
             * grant covers WhatsApp and WhatsApp Business alike, and the Feed
             * lists whichever of them has statuses.
             */
            boolean quietDay = false;
            for (int i = 0; i < pkgs.length; i++) {
                String[][] routes = {
                        {"Media", ".Statuses"},                    // granted the app folder
                        {apps[i], "Media", ".Statuses"},           // granted com.whatsapp*/
                        {pkgs[i], apps[i], "Media", ".Statuses"},  // granted Android/media
                };
                for (String[] route : routes) {
                    DocumentFile at = rootDir;
                    int depth = 0;
                    for (String step : route) {
                        DocumentFile next = childDir(at, step, seen);
                        if (next == null) {
                            break;
                        }
                        at = next;
                        depth++;
                    }
                    if (depth == route.length) {
                        addUnique(found, at);
                        break;
                    }
                    /*
                     * The whole parent chain resolved and only ".Statuses" was
                     * missing: WhatsApp removes that folder when the last status
                     * expires, so this is a quiet day on a healthy grant, not an
                     * unknown layout. Reaching depth 0 on a route says nothing
                     * (the grant simply is not that folder), which is why the
                     * one-step route is handled separately below.
                     */
                    if (depth == route.length - 1) {
                        quietDay = true;
                        break;
                    }
                }
            }
            if (!found.isEmpty() || quietDay) {
                return found;
            }
            // Granted Media itself: ".Statuses" is a direct child, or it is a
            // quiet day. The folder's own name is what tells this apart from
            // "the grant is some unrelated folder", which the crawl below is for.
            DocumentFile direct = childDir(rootDir, ".Statuses", seen);
            if (direct != null) {
                found.add(direct);
                return found;
            }
            if ("Media".equals(dirName)) {
                return found;
            }
            DocumentFile crawled = searchForStatusFolder(
                    rootDir, 0, MAX_SEARCH_DEPTH, new int[] {MAX_SEARCH_NODES});
            if (crawled != null) {
                found.add(crawled);
            }
        } catch (Exception e) {
            android.util.Log.w("FolderPicker", "Error finding status folder: " + e.getMessage());
        }
        return found;
    }

    private static void addUnique(java.util.List<DocumentFile> list, DocumentFile file) {
        String uri = file.getUri().toString();
        for (DocumentFile f : list) {
            if (uri.equals(f.getUri().toString())) {
                return;
            }
        }
        list.add(file);
    }

    /** Bounded breadth-first hunt, one query per directory. */
    private DocumentFile searchForStatusFolder(
            DocumentFile dir, int depth, int maxDepth, int[] budget) {
        if (depth > maxDepth || dir == null || budget[0] <= 0) {
            return null;
        }
        budget[0]--;
        java.util.List<String> names = new java.util.ArrayList<>();
        java.util.List<DocumentFile> dirs = childDirs(dir, names);
        for (int i = 0; i < dirs.size(); i++) {
            if (".Statuses".equals(names.get(i))) {
                return dirs.get(i);
            }
        }
        for (int i = 0; i < dirs.size(); i++) {
            DocumentFile result = searchForStatusFolder(dirs.get(i), depth + 1, maxDepth, budget);
            if (result != null) {
                return result;
            }
        }
        return null;
    }
}
