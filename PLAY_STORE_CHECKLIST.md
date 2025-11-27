# Play Store Publishing Checklist

## 🔐 Keystore Setup

- [x] Generate release keystore (statussaverpro-release.keystore)
- [ ] Update android/keystore.properties with actual passwords
- [ ] Keep keystore backup in safe location (NEVER lose this!)

## 📱 App Information

- **App Name**: Status Saver Pro
- **Package Name**: com.vaishnavmandlik.statussaverpro
- **Version Code**: 1
- **Version Name**: 1.0.0

## 🎨 Assets Needed

### Required Graphics

- [ ] App Icon: 512x512 PNG (high-res icon)
- [ ] Feature Graphic: 1024x500 PNG (banner image)
- [ ] Screenshots (Phone): Minimum 2, max 8
  - Resolution: 1080x1920 or 1920x1080
- [ ] Screenshots (7-inch Tablet): Optional
- [ ] Screenshots (10-inch Tablet): Optional

### Store Listing

- [ ] Short Description (max 80 characters)
- [ ] Full Description (max 4000 characters)
- [ ] Category: Tools / Social
- [ ] Contact Email
- [ ] Privacy Policy URL (REQUIRED for this app)

## 📄 Privacy Policy

Since your app accesses photos/videos, you MUST provide a privacy policy.

**Template**:

```
Status Saver Pro - Privacy Policy

This app allows users to save WhatsApp statuses to their device.
We do not collect, store, or share any user data.

Permissions used:
- Storage: To save status files to your device
- Read Media: To access WhatsApp status files

All data remains on your device. We do not have access to your files.

Contact: your-email@example.com
```

Host this on:

- GitHub Pages
- Your website
- Free privacy policy generators

## 🔧 Build Steps

1. Update keystore.properties with your passwords
2. Clean build:
   ```bash
   npm run build:android:clean
   ```
3. Build App Bundle:
   ```bash
   npm run build:android:bundle
   ```
4. Output location:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```

## 🚀 Google Play Console Steps

1. **Create Account**

   - Go to https://play.google.com/console
   - Pay $25 one-time registration fee

2. **Create App**

   - Click "Create app"
   - Select language and app name
   - Choose "App" and "Free"
   - Accept declarations

3. **App Content**

   - Privacy Policy (required)
   - App Access (all features available)
   - Ads (select if you have ads)
   - Content Rating (complete questionnaire)
   - Target Audience (age groups)
   - News App (No)
   - COVID-19 Contact Tracing (No)
   - Data Safety (fill out form)

4. **Store Listing**

   - Upload all graphics
   - Add descriptions
   - Select category
   - Add contact details

5. **Production Release**
   - Go to "Production" → "Create new release"
   - Upload app-release.aab
   - Add release notes
   - Review and rollout to production

## ⚠️ Important Notes

### Before Publishing:

- [ ] Test AAB on a real device
- [ ] Verify all features work in release mode
- [ ] Check permissions are properly requested
- [ ] Ensure privacy policy is accessible
- [ ] Review content rating answers

### After Publishing:

- Keep keystore backed up (you'll need it for updates)
- Monitor crash reports in Play Console
- Respond to user reviews
- Plan for future updates

### Keystore Security:

⚠️ **CRITICAL**: Never lose your keystore file and passwords!

- Store keystore in multiple secure locations
- Save passwords in a password manager
- Without the keystore, you cannot update your app

## 📈 Post-Launch

### Monitoring

- Check Google Play Console for:
  - Installation stats
  - Crash reports
  - User reviews
  - Pre-launch report results

### Future Updates

When releasing updates:

1. Increment versionCode and versionName in build.gradle
2. Build new AAB with same keystore
3. Upload to Play Console
4. Add release notes

## 🔗 Useful Links

- [Play Console](https://play.google.com/console)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Privacy Policy Generator](https://www.freeprivacypolicy.com/free-privacy-policy-generator/)

## 📝 Version History

| Version | Code | Date | Notes           |
| ------- | ---- | ---- | --------------- |
| 1.0.0   | 1    | TBD  | Initial release |
