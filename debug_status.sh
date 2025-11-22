#!/bin/bash
# WhatsApp Status Downloader Debug Script

echo "🔍 WhatsApp Status Debug Information"
echo "===================================="
echo ""

echo "📱 Device Information:"
adb shell getprop ro.build.version.release
adb shell getprop ro.product.model
echo ""

echo "📦 WhatsApp Installation:"
adb shell pm path com.whatsapp
echo ""

echo "📂 Checking WhatsApp Status Paths:"
echo ""

# Array of paths to check
paths=(
  "/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses"
  "/storage/emulated/0/WhatsApp/Media/.Statuses"
  "/sdcard/Android/media/com.whatsapp/WhatsApp/Media/.Statuses"
  "/sdcard/WhatsApp/Media/.Statuses"
)

for path in "${paths[@]}"; do
  echo "Checking: $path"
  adb shell "ls -la '$path' 2>&1"
  echo ""
done

echo "🔍 Searching for .Statuses folders:"
adb shell "find /storage/emulated/0 -name '.Statuses' -type d 2>/dev/null"
echo ""

echo "📊 App Permissions:"
adb shell dumpsys package com.whatsappstatus | grep -A5 "granted=true"
echo ""

echo "💾 External Storage Path:"
adb shell "echo \$EXTERNAL_STORAGE"
echo ""

echo "📝 To view live app logs, run:"
echo "   adb logcat | grep ReactNativeJS"
