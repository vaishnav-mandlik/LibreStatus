# F-Droid

The app is live on F-Droid as `com.vaishnavmandlik.librestatus`
(https://f-droid.org/packages/com.vaishnavmandlik.librestatus/). F-Droid builds
it from this repository and signs it itself, so there is no APK to upload and
no key is involved.

`com.vaishnavmandlik.librestatus.yml` here is a copy of the recipe in
[fdroiddata](https://gitlab.com/fdroid/fdroiddata/-/blob/master/metadata/com.vaishnavmandlik.librestatus.yml).
The copy in fdroiddata is the one that counts; keep this one in step with it.

## Flavors

The same code ships to F-Droid and Google Play. F-Droid builds the `fdroid`
product flavor (`gradle: - fdroid` in the recipe), which needs no keystore. The
`play` flavor is never built by F-Droid.

## Releasing a new version

Most releases need nothing beyond a tag:

1. Bump `versionCode` and `versionName` in `android/app/build.gradle`.
2. Add `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`.
3. Commit, then `git tag -a <versionName> -m <versionName>` and push the tag.

`UpdateCheckMode: Tags` and `AutoUpdateMode: Version` make the F-Droid bot copy
the last build block for the new tag. The per-ABI version codes
(`10 * versionCode + 1..4`) come from `VercodeOperation`.

The recipe itself needs an update in fdroiddata (a merge request) only when
the build changes shape, for example:

- a native dependency is added or removed: update the `scanignore` list
- the Gradle task or flavor changes
- React Native is upgraded and the JDK `sed` lines stop matching

Test a recipe change locally with `fdroid build -v -l com.vaishnavmandlik.librestatus`
(needs `fdroidserver`), or let the fdroiddata merge request CI build it.

Docs: https://f-droid.org/docs/Build_Metadata_Reference/
