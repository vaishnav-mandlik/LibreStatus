/**
 * English is the source of truth for the key set.
 *
 * `TranslationKey` is derived from this object, and every other locale is typed
 * `Dictionary`, so adding a key here is a compile error in all seven other
 * locales until they are filled in. That is what keeps the translations from
 * drifting without any lint rule or CI check.
 *
 * The copy is the "Status Saver" prototype's, verbatim, screens render it
 * rather than paraphrasing it. Placeholders ({n}, {size}, {time}, …) are filled
 * by `t()`; keys ending in `_one` / `_other` are picked by `tp()`. The short
 * lowercase words used as toast meta (skip, scan, private, …) are set in
 * monospace as tags and stay English in every locale.
 */
export const en = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  // The app's name as the wordmark sets it. It used to carry a "Pro" suffix in
  // the accent colour; the app is plain "Status Saver" now.
  'brand.name': 'Status Saver',

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.feed': 'Feed',
  'nav.library': 'Saved',
  'nav.tools': 'Tools',
  'nav.settings': 'Settings',

  // ── Common ────────────────────────────────────────────────────────────────
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.undo': 'Undo',
  'common.refresh': 'Refresh',
  'common.sortBy': 'Sort by',
  'common.select': 'Select',
  'common.retry': 'Try again',
  'common.ok': 'OK',

  // ── Error boundary ────────────────────────────────────────────────────────
  // Shown only when a render throws; the retry re-mounts the shell.
  'error.title': 'Something went wrong',
  'error.body':
    'The app hit an unexpected problem and stopped drawing this screen. Nothing was lost. Your saved statuses are still on this device.',

  // ── Onboarding ────────────────────────────────────────────────────────────
  // The three first-run intro slides, shown once after install.
  'intro.one.title': 'Every status, in one grid.',
  'intro.one.body':
    'The photos and videos your messaging app has already cached on this phone, gathered into one place you can scroll.',
  'intro.two.title': 'Keep the ones worth keeping.',
  'intro.two.body':
    'A status is gone in 24 hours. Save it and a copy lands in your gallery, in a folder called Status, for good.',
  'intro.three.title': 'It never leaves your phone.',
  'intro.three.body':
    'No account, no ads, no tracking. The app has no internet permission at all, so nothing can be uploaded.',
  'intro.next': 'Next',
  'intro.start': 'Get started',
  'intro.skip': 'Skip',
  'intro.progress': 'Slide {n} of {total}',
  'onboard.title': 'Point us at the folder your messaging app already uses.',
  'onboard.body':
    'We read the status files cached on this phone. Nothing is uploaded. The app has no internet permission at all.',
  'onboard.step1':
    'Open your messaging app and view a status you want to keep.',
  // Step 2 is three spans so the folder path can sit in the accent colour.
  'onboard.step2a': 'Come back here and choose ',
  'onboard.step2Accent': 'Android › media',
  'onboard.step2b': ' in the picker Android shows.',
  'onboard.step3': 'Done. Auto-save can keep every new status from then on.',
  'onboard.note': 'Read-only access to one folder. Revocable anytime.',
  'onboard.cta': 'Choose folder',
  'onboard.skip': 'Not now',
  'onboard.granted': 'Folder access granted',
  'onboard.failed': 'Could not open that folder',

  // ── Feed ──────────────────────────────────────────────────────────────────
  'feed.auto': 'Auto',
  'feed.autoA11y': 'Auto-save is on. Open Tools',

  // ── Filter tabs ───────────────────────────────────────────────────────────
  'filter.all': 'All',
  'filter.photos': 'Photos',
  'filter.videos': 'Videos',

  // ── Section eyebrows ──────────────────────────────────────────────────────
  'group.justNow': 'Just now',
  'group.earlierToday': 'Earlier today',
  'group.today': 'Today',
  'group.earlierWeek': 'Earlier this week',

  // ── Tiles ─────────────────────────────────────────────────────────────────
  'tile.new': 'new',
  'tile.saved': 'Saved',
  'tile.video': 'Video',
  'tile.photo': 'Photo',

  // ── Empty states ──────────────────────────────────────────────────────────
  'empty.feedTitle': 'No statuses here',
  'empty.feedBody':
    'View a status in your messaging app first, then come back and it will show up on its own.',
  'empty.libraryTitle': 'Nothing saved yet',
  'empty.libraryBody':
    'Tap a status, then Save. Everything you keep lands here and stays after the 24 hours are up.',
  'empty.libraryAccessBody':
    'Saved statuses live in your phone storage. Allow storage access to list them here. Nothing is uploaded; the app has no internet permission.',
  'empty.allowAccess': 'Allow storage access',
  'empty.openFeed': 'Go to the Feed',
  'empty.noFolderTitle': 'Nothing to read yet',
  'empty.noFolderBody':
    'Point the app at the folder your messaging app keeps its statuses in, and they show up here on their own.',
  'empty.noStorageBody':
    'Statuses are read from this phone’s storage. Allow storage access and they show up here on their own.',
  'empty.allowStorage': 'Allow storage access',
  'empty.favTitle': 'No favourites yet',
  'empty.favBody': 'Tap the heart on a saved status and it shows up here.',
  'empty.vaultTitle': 'The Vault is empty',
  'empty.vaultBody':
    'Move a saved status here to keep it out of your gallery.',
  'empty.openWhatsApp': 'Open messaging app',

  // ── Library ───────────────────────────────────────────────────────────────
  'library.all': 'All saved',
  'library.fav': 'Favourites',
  'library.vault': 'Vault',
  'library.meta_one': '{n} file · {size}',
  'library.meta_other': '{n} files · {size}',

  // ── Selection ─────────────────────────────────────────────────────────────
  'select.title': 'Select items',
  'select.hint': 'Tap to choose',
  'select.count_one': '{n} selected',
  'select.count_other': '{n} selected',
  'select.all': 'Select all',
  'select.clear': 'Clear',
  'select.save': 'Save',
  'select.saveN': 'Save {n}',
  'select.delete': 'Delete',
  'select.deleteN': 'Delete {n}',
  'select.vault': 'Move to Vault',
  'select.restore': 'Restore to gallery',
  'select.share': 'Share',

  // ── Sort sheet ────────────────────────────────────────────────────────────
  'sort.new': 'Newest first',
  'sort.old': 'Oldest first',
  'sort.big': 'Largest file',
  'sort.type': 'Group by type',

  // ── Tools ─────────────────────────────────────────────────────────────────
  'tools.subtitle': 'automation & storage',
  'tools.autoSave': 'Auto-save',
  'tools.autoTitle': 'Save new statuses for me',
  'tools.autoSub': 'Runs when you open the app. Nothing leaves the device.',
  'tools.whatToKeep': 'What to keep',
  'tools.modeBoth': 'Everything',
  'tools.modePhotos': 'Photos',
  'tools.modeVideos': 'Videos',
  'tools.autoVault': 'Send straight to Vault',
  'tools.whereSaves': 'Where saves go',
  'tools.saveFolder': 'Save folder',
  'tools.savePath': 'DCIM / Status',
  'tools.savePathLegacy': 'Pictures and Movies / Status',
  'tools.change': 'Change',
  'tools.storage': 'Storage',
  'tools.usedTotal': '{size} kept',
  'tools.storageReading': 'Reading storage…',
  'tools.filesKept_one': '{n} file',
  'tools.filesKept_other': '{n} files',
  'tools.photosShare': 'Photos {size}',
  'tools.videosShare': 'Videos {size}',
  'tools.message': 'Message a number',
  'tools.dmBody':
    'Open a chat with any number without saving it to your contacts.',
  'tools.dialCode': 'Country code',
  'tools.phonePlaceholder': 'Phone number',
  'tools.openChat': 'Open chat',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Settings',
  'settings.aboutCard':
    'Every feature is on, free, forever. No ads, no accounts, no internet permission, so the app cannot send your data anywhere.',
  'settings.appearance': 'Appearance',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.themeSystem': 'System',
  'settings.privacy': 'Privacy',
  'settings.hideRecents': 'Hide from recents',
  'settings.hideRecentsSub': 'Blank the app preview when switching',
  'settings.statusFolder': 'Status folder',
  'settings.folderGranted': 'Android/media · granted',
  'settings.folderMissing': 'Not chosen yet · tap to choose',
  'settings.mediaAccess': 'Storage access',
  'settings.mediaGranted': 'Allowed · every saved status shows',
  'settings.mediaMissing': 'Not allowed · saved statuses stay hidden',
  'settings.general': 'General',
  'settings.language': 'Language',
  'settings.languagesAvailable': '{n} available',
  'settings.shareApp': 'Share app',
  'settings.rate': 'Rate this app',
  'settings.feedback': 'Send feedback',
  'toast.noStore': 'No app here can open that link',
  'toast.metaLink': 'link',
  'feedback.subject': 'Status Saver feedback',
  'settings.help': 'Help',
  'settings.legal': 'Privacy & terms',
  'settings.footer': 'No internet permission · no trackers',
  'settings.madeBy': 'Made with ❤️ by Vaishnav',

  // ── Viewer ────────────────────────────────────────────────────────────────
  'viewer.captured': 'captured',
  'viewer.size': 'size',
  'viewer.type': 'type',
  'viewer.hint': 'Double-tap the media to save · tap the sides to move',
  'viewer.save': 'Save',
  'viewer.saved': 'Saved',
  'viewer.delete': 'Delete',
  'viewer.share': 'Share',
  'viewer.repost': 'Repost',
  'viewer.close': 'Close',
  'viewer.zoom': 'Zoom',
  'viewer.favourite': 'Favourite',
  'viewer.play': 'Play',
  'viewer.pause': 'Pause',
  'viewer.counter': '{n} / {total}',
  'viewer.today': 'Today, {time}',
  'viewer.yesterday': 'Yesterday, {time}',

  // ── Batch overlay ─────────────────────────────────────────────────────────
  'batch.title': 'Saving',
  'batch.body': 'Writing originals to Gallery › Status. Keeping full quality.',
  'batch.progress': '{done} / {total}',

  // ── Toasts ────────────────────────────────────────────────────────────────
  // Each message is paired with a short meta tag set in monospace on the right.
  'toast.saved': 'Saved to Gallery › Status',
  'toast.savedMany': '{n} statuses saved',
  'toast.alreadySaved': 'Already in your library',
  'toast.metaSkip': 'skip',
  'toast.upToDate': 'Up to date · scanned just now',
  'toast.metaScan': 'scan',
  'toast.movedToVault_one': '{n} status moved to Vault',
  'toast.movedToVault_other': '{n} statuses moved to Vault',
  'toast.restored_one': '{n} status restored',
  'toast.restored_other': '{n} statuses restored',
  'toast.vaultedStillPublic':
    'Kept in the Vault, but the gallery copy is still there',
  'toast.metaPrivate': 'private',
  'toast.shareOpened': 'Share sheet opened',
  'toast.shareOpenedN': 'Share sheet opened · {n} files',
  'toast.metaSystem': 'system',
  'toast.removed_one': 'Removed from library',
  'toast.removed_other': '{n} statuses removed',
  'toast.metaDeleted': 'deleted',
  'toast.openingWhatsApp': 'Opening your messaging app',
  'toast.metaHandoff': 'handoff',
  'toast.favAdded': 'Added to Favourites',
  'toast.favRemoved': 'Removed from Favourites',
  'toast.metaLibrary': 'library',
  'toast.reposted': 'Opened in your messaging app',
  'toast.metaRepost': 'repost',
  'toast.autoOn': 'Auto-save turned on',
  'toast.autoOff': 'Auto-save turned off',
  'toast.metaTools': 'tools',
  'toast.chooseFolder': 'Choose a folder in Files',
  'toast.metaStorage': 'storage',
  'toast.needDigits': 'Enter at least 6 digits',
  'toast.needDialCode': 'Enter a country code',
  'toast.metaCheck': 'check',
  'toast.openingChat': 'Opening a chat with {number}',
  'toast.metaChat': 'chat',
  'toast.lightTheme': 'Light theme applies on device',
  'toast.metaTheme': 'theme',
  'toast.folderGranted': 'Folder access granted',
  'toast.metaSetup': 'setup',
  'toast.saveFailed': 'Could not save that status',
  'toast.deleteFailed': 'Could not remove that file',
  'toast.permissionNeeded': 'Allow storage access to continue',
  'toast.openSettings': 'Open settings',
  'toast.whatsappMissing': 'The messaging app is not installed',
  'toast.repostFailed': 'Could not hand this to the messaging app',
  'toast.autoSaved_one': '{n} new status saved automatically',
  'toast.autoSaved_other': '{n} new statuses saved automatically',

  // ── Confirmations ─────────────────────────────────────────────────────────
  'confirm.deleteTitle_one': 'Remove {n} status?',
  'confirm.deleteTitle_other': 'Remove {n} statuses?',
  'confirm.deleteBody':
    'They leave your library and gallery. This cannot be undone.',
  'confirm.delete': 'Remove',
  'confirm.cancel': 'Keep',

  // ── Permission guide ──────────────────────────────────────────────────────
  // A walkthrough of Android's own folder picker. The mock.* strings imitate
  // the system UI so the user can recognise the real thing when it appears.
  'guide.title': 'Choosing the folder',
  'guide.intro':
    'Android shows its own file picker. Two taps and you are done.',
  'guide.step1': 'In the picker, open Android › media and tap Use this folder.',
  'guide.step2':
    'Confirm with Allow. Access is read-only and you can revoke it anytime.',
  'guide.open': 'Open the picker',
  'guide.mockInternal': 'Internal storage',
  'guide.mockUseFolder': 'Use this folder',
  'guide.mockAllowTitle': 'Allow access to media?',
  'guide.mockAllowBody':
    'This lets Status Saver read the status files cached here.',
  'guide.mockAllow': 'Allow',

  // ── Help ──────────────────────────────────────────────────────────────────
  'help.title': 'Help',
  'help.gettingStarted': 'Getting started',
  'help.q1': 'Why do I see no statuses?',
  'help.a1':
    'Open your messaging app and watch someone’s status first. Status Saver can only read what that app has already downloaded to this phone.',
  'help.q2': 'Where do saved files go?',
  'help.a2':
    'Into your gallery, in an album called Status. Anything you mark private stays inside Status Saver instead and never reaches the gallery.',
  'help.q3': 'Does the person know I saved it?',
  'help.a3':
    'No. Everything happens on your device and the app cannot reach the internet. Be considerate about resharing what other people post.',
  'help.q4': 'A status vanished. Why?',
  'help.a4':
    'Cached statuses are deleted after 24 hours. Save the ones you want to keep before then.',
  'help.q5': 'The folder picker keeps rejecting my choice.',
  'help.a5':
    'Pick the folder named media inside Android, not a folder deeper in. Status Saver finds the .Statuses folder underneath it on its own.',
  'help.troubleshooting': 'Troubleshooting',
  'help.resetFolder': 'Pick the status folder again',
  'help.resetFolderBody':
    'Use this if statuses stopped appearing after your messaging app updated.',

  // ── Privacy & terms ───────────────────────────────────────────────────────
  'about.title': 'Privacy & terms',
  'about.tagline': 'View, save and share statuses, fully offline.',
  'about.privacyHeading': 'Privacy',
  'about.privacyBody':
    'Status Saver has no INTERNET permission, so it cannot send anything anywhere. There is no analytics, no advertising ID and no crash reporting. It never asks for “All files access”. The status files it reads are the ones your messaging app already stored on your device.',
  'about.dataHeading': 'What is stored',
  'about.dataBody':
    'Your settings, your language, your favourites, the list of statuses you saved and everything in the Vault. All of it lives on this device and is deleted when you uninstall the app. Copies saved to your gallery stay until you delete them.',
  'about.termsHeading': 'Terms',
  'about.termsBody':
    'Status Saver is provided as-is, with no warranty. You are responsible for how you use the media you keep: respect the privacy of the people who posted it and the copyright of anything you reshare.',
  'about.disclaimer':
    'Status Saver is an independent app. It is not affiliated with, endorsed by, or connected to WhatsApp LLC or Meta Platforms, Inc. WhatsApp and Meta are trademarks of their respective owners. This app does not modify or interfere with any messaging app, and reads only the status files already stored on this device.',

  // ── Accessibility labels ──────────────────────────────────────────────────
  // Screen-reader only, for icon-only controls. Device tests locate controls
  // by these, so they match the action names listed in the spec.
  'a11y.refresh': 'Refresh',
  'a11y.sort': 'Sort by',
  'a11y.settings': 'Settings',
  'a11y.selectMode': 'Select',
  'a11y.exitSelect': 'Exit selection',
  'a11y.tile': '{kind} {time}',
  'a11y.backToFeed': 'Back to feed',
} as const;

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;
