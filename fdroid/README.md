# F-Droid submission

This folder holds the F-Droid build recipe for LibreStatus. F-Droid builds the
app from source on its own servers and signs it, so there is no APK to upload.

## How to submit

1. Fork the F-Droid data repo: https://gitlab.com/fdroid/fdroiddata
2. Copy `com.vaishnavmandlik.librestatus.yml` into the fork's `metadata/`
   folder (the file name must equal the application id).
3. Fill in the Node tarball checksum (see below).
4. Test the build locally with `fdroid build -v -l com.vaishnavmandlik.librestatus`
   (needs the `fdroidserver` tools).
5. Open a merge request against `fdroiddata`. An F-Droid maintainer reviews it,
   the CI builds the app, and once merged it appears in the store.

## Notes

- The build downloads Node 20 because the build servers may ship an older
  version. Replace `PUT_SHA256_OF_THE_TARBALL_HERE` with the real checksum from
  https://nodejs.org/dist/v20.18.1/SHASUMS256.txt (the line for
  `node-v20.18.1-linux-x64.tar.gz`). Bump the Node version as needed.
- The Node setup step is the part F-Droid reviewers most often help refine for
  React Native apps; expect a little back and forth on the merge request.
- New releases: bump `versionCode`/`versionName` in `android/app/build.gradle`,
  tag the commit (e.g. `git tag -a 1.0.2`), push the tag. `UpdateCheckMode: Tags`
  lets F-Droid pick it up automatically.

Docs: https://f-droid.org/docs/Building_Applications and
https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/
