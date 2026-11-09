# R8 rules for the release build (minifyEnabled + shrinkResources).
#
# React Native, react-native-svg and androidx.media3 ship consumer rules that
# are applied automatically; everything here is either the app's own code or a
# gap those consumer rules leave. Anything reached only from JavaScript is
# invisible to R8's reachability analysis, so it has to be named explicitly —
# a shrunk-away class shows up as a runtime crash on a screen that worked in
# debug, which is the whole failure mode these rules exist to prevent.

# Keep annotations: the bridge reads @ReactMethod off the class at runtime.
-keepattributes *Annotation*

# A release stack trace in `adb logcat` is the only diagnostic this app has —
# there is no crash reporter and no INTERNET permission to feed one.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── This app ───────────────────────────────────────────────────────────────
# FolderPickerModule's methods are called from JS by name, and its @ReactMethod
# signatures are read by reflection, so neither the names nor the parameter
# types may be rewritten. Three classes: obfuscating them saves nothing.
-keep class com.mandlik.statussaverpro.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
-keep class * implements com.facebook.react.ReactPackage { *; }

# ── react-native-video ─────────────────────────────────────────────────────
# The player is instantiated from a view manager the JS side names, and media3
# resolves several data sources and renderers reflectively.
-keep class com.brentvatne.** { *; }
-dontwarn com.brentvatne.**
-dontwarn androidx.media3.**

# ── react-native-share ─────────────────────────────────────────────────────
# `cl.json` looks target apps up by package name and builds intents through the
# FileProvider declared in its own manifest; it ships no consumer rules.
-keep class cl.json.** { *; }
-dontwarn cl.json.**

# ── react-native-svg ───────────────────────────────────────────────────────
# Its consumer rules already keep com.horcrux.svg.**; this only silences the
# optional AndroidX graphics paths it references but the app never loads.
-dontwarn com.horcrux.svg.**
