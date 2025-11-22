# Debugging Guide - Status Not Found Issue

## 🔍 How to Debug

The app now has comprehensive logging. Follow these steps:

### 1. Enable Debug Console

**Option A: Using React Native Debugger (Chrome)**

```bash
# In your device, shake the phone or press Ctrl+M (in emulator)
# Select "Debug"
# Open Chrome and go to: chrome://inspect
```

**Option B: Using Terminal (Logcat)**

```bash
# View all logs
adb logcat | grep -E "ReactNative|WhatsApp"

# Or just React Native logs
adb logcat -s ReactNativeJS:V
```

### 2. Check the Logs

When you open the app and tap on the WhatsApp tab, you should see logs like:

```
🚀 Loading statuses for type: whatsapp
✅ Permissions granted
🔍 Searching for WhatsApp status folder...
📂 External Storage Path: /storage/emulated/0
Checking path: /storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses
Path exists: true
✅ Found WhatsApp status folder: /storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses
📄 Files found: 5
📂 Reading files from: /storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses
📊 Total files in directory: 5
✅ Found image: IMG-20231119-WA0001.jpg
✅ Found video: VID-20231119-WA0001.mp4
✅ Total valid statuses found: 5
```

### 3. Common Issues and Fixes

#### Issue 1: "No folder found"

**Logs show:**

```
❌ No WhatsApp status folder found
```

**Solution:**

1. Make sure WhatsApp is installed
2. Open WhatsApp and view someone's status
3. The status must be less than 24 hours old
4. Try different paths manually:

```bash
# Check if WhatsApp is installed
adb shell pm list packages | grep whatsapp

# Check actual WhatsApp paths
adb shell ls -la /storage/emulated/0/WhatsApp/Media/.Statuses
adb shell ls -la /storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses
```

#### Issue 2: "Cannot read directory"

**Logs show:**

```
⚠️ Cannot read directory: Permission denied
```

**Solution:**

1. Uninstall the app completely
2. Reinstall: `npm run android`
3. Grant all permissions when prompted
4. For Android 11+, you may need to enable "All files access":
   - Settings → Apps → WhatsApp Status Downloader
   - Permissions → Files and Media → Allow

#### Issue 3: "Path exists: false" for all paths

**Solution:**

The WhatsApp status path might be different on your device. Find it manually:

```bash
# Connect to device shell
adb shell

# Search for WhatsApp directories
find /storage/emulated/0 -name ".Statuses" 2>/dev/null
find /sdcard -name ".Statuses" 2>/dev/null

# Or search for WhatsApp folder
find /storage/emulated/0 -type d -name "WhatsApp" 2>/dev/null
```

Once you find the actual path, you can add it to the app:

- Edit `src/utils/statusManager.ts`
- Add your path to `WHATSAPP_STATUS_PATHS` array

#### Issue 4: Files found but none valid

**Logs show:**

```
📊 Total files in directory: 10
⚠️ Skipping file without extension: .nomedia
⚠️ Skipping unsupported file type: status_12345.tmp
✅ Total valid statuses found: 0
```

**Solution:**
This means the status files are not in a recognized format. WhatsApp statuses are usually:

- Images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- Videos: `.mp4`, `.3gp`, `.avi`, `.mkv`, `.mov`

If you see different extensions, add them to the app.

### 4. Manual Testing Steps

1. **Clear App Data:**

   ```bash
   adb shell pm clear com.whatsappstatus
   ```

2. **View a status in WhatsApp:**

   - Open WhatsApp
   - Go to Status tab
   - View someone's status (image or video)
   - Don't close WhatsApp yet

3. **Check if file exists:**

   ```bash
   adb shell ls -l /storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses/
   ```

   You should see files like: `IMG-20231119-WA0001.jpg`

4. **Open the Status Downloader app**
5. **Grant permissions when asked**
6. **Check logs** (see step 2 above)

### 5. Android Version Specific Issues

#### Android 11+ (Version 30+)

- WhatsApp moved status to: `/Android/media/com.whatsapp/`
- Requires scoped storage access
- May need "All files access" permission

#### Android 10 (Version 29)

- Uses: `/WhatsApp/Media/.Statuses/`
- Requires legacy external storage flag (already added)

#### Android 9 and below

- Uses: `/WhatsApp/Media/.Statuses/`
- Requires READ and WRITE storage permissions

### 6. Check Current Setup

Run these commands to verify:

```bash
# Check app permissions
adb shell dumpsys package com.whatsappstatus | grep permission

# Check Android version
adb shell getprop ro.build.version.release

# Check if WhatsApp is installed
adb shell pm path com.whatsapp

# Check accessible paths
adb shell run-as com.whatsappstatus ls -la /storage/emulated/0/
```

### 7. Force Refresh

In the app:

1. Pull down on the screen to refresh
2. Or tap the "Refresh" button in empty state
3. Check logs again

### 8. Test Permissions

Add this temporary button to test permissions manually:

```typescript
// In StatusListScreen.tsx, add a button:
<TouchableOpacity
  onPress={async () => {
    const granted = await requestStoragePermission();
    console.log('Permission test result:', granted);
    Alert.alert('Permission', granted ? 'Granted ✅' : 'Denied ❌');
  }}
>
  <Text>Test Permissions</Text>
</TouchableOpacity>
```

### 9. Alternative: Use File Picker

If status detection still doesn't work, you can add a file picker as backup:

```bash
npm install react-native-document-picker
```

Then users can manually navigate to the WhatsApp status folder.

## 🎯 Expected Working Scenario

When everything works correctly:

1. Open WhatsApp → View someone's status
2. File appears in: `/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses/`
3. Open Status Downloader app
4. App requests and gets permission
5. App scans paths and finds the folder
6. App reads files from folder
7. Status appears in grid

## 📱 Test on Different Devices

Try testing on:

- Different Android versions (10, 11, 12, 13, 14)
- Different manufacturers (Samsung, Xiaomi, etc. may have different paths)
- Real device vs emulator

## 🔧 Quick Fixes to Try

1. **Reinstall WhatsApp** - Sometimes fixes path issues
2. **Clear WhatsApp cache** - Settings → Apps → WhatsApp → Clear cache
3. **View a NEW status** - Old statuses might be expired
4. **Restart device** - Clears permission cache
5. **Check storage space** - Ensure device has free space

## 📞 Getting More Info

To get detailed info from your device:

```bash
# Get all info
adb shell pm dump com.whatsappstatus > app_info.txt
adb shell dumpsys package com.whatsappstatus > package_info.txt

# View in realtime
adb logcat -c  # Clear logs
adb logcat | tee device_logs.txt  # Save logs to file
```

Then open the app and perform actions. The logs will be saved.

---

## ✅ Once It's Working

After you find the correct path on your device, the app should work perfectly. The logs will help identify exactly where WhatsApp stores statuses on your specific device.
