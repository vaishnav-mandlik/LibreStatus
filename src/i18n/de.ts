import type { Dictionary } from './en';

export const de: Dictionary = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  'brand.name': 'Status Saver',

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.feed': 'Feed',
  'nav.library': 'Gespeichert',
  'nav.tools': 'Werkzeuge',
  'nav.settings': 'Einstellungen',

  // ── Common ────────────────────────────────────────────────────────────────
  'common.close': 'Schließen',
  'common.cancel': 'Abbrechen',
  'common.undo': 'Rückgängig',
  'common.refresh': 'Aktualisieren',
  'common.sortBy': 'Sortieren nach',
  'common.select': 'Auswählen',
  'common.retry': 'Erneut versuchen',
  'common.ok': 'OK',

  // ── Error boundary ────────────────────────────────────────────────────────
  'error.title': 'Etwas ist schiefgelaufen',
  'error.body':
    'In der App ist ein unerwarteter Fehler aufgetreten, deshalb wurde dieser Bildschirm nicht gezeichnet. Es ist nichts verloren – deine gespeicherten Status sind weiterhin auf diesem Gerät.',

  // ── Onboarding ────────────────────────────────────────────────────────────
  // The three first-run intro slides, shown once after install.
  'intro.one.title': 'Alle Status in einem Raster.',
  'intro.one.body':
    'Die Fotos und Videos, die deine Messenger-App bereits auf diesem Telefon zwischengespeichert hat, an einem Ort.',
  'intro.two.title': 'Behalte, was sich lohnt.',
  'intro.two.body':
    'Ein Status ist nach 24 Stunden weg. Speichere ihn, und eine Kopie bleibt in deiner Galerie, im Ordner Status.',
  'intro.three.title': 'Es verlässt dein Telefon nie.',
  'intro.three.body':
    'Kein Konto, keine Werbung, kein Tracking. Die App hat gar keine Internetberechtigung – nichts kann hochgeladen werden.',
  'intro.next': 'Weiter',
  'intro.start': 'Los geht’s',
  'intro.skip': 'Überspringen',
  'intro.progress': 'Seite {n} von {total}',
  'onboard.title':
    'Zeig uns den Ordner, den deine Messenger-App schon benutzt.',
  'onboard.body':
    'Wir lesen die Statusdateien, die auf diesem Handy zwischengespeichert sind. Nichts wird hochgeladen, die App hat überhaupt keine Internet-Berechtigung.',
  'onboard.step1':
    'Öffne deine Messenger-App und sieh dir einen Status an, den du behalten willst.',
  'onboard.step2a': 'Komm hierher zurück und wähle ',
  'onboard.step2Accent': 'Android › media',
  'onboard.step2b': ' in der Auswahl, die Android anzeigt.',
  'onboard.step3':
    'Fertig. Ab dann kann das automatische Speichern jeden neuen Status behalten.',
  'onboard.note': 'Nur-Lese-Zugriff auf einen Ordner. Jederzeit widerrufbar.',
  'onboard.cta': 'Ordner wählen',
  'onboard.skip': 'Nicht jetzt',
  'onboard.granted': 'Ordnerzugriff gewährt',
  'onboard.failed': 'Dieser Ordner konnte nicht geöffnet werden',

  // ── Feed ──────────────────────────────────────────────────────────────────
  'feed.auto': 'Auto',
  'feed.autoA11y': 'Automatisches Speichern ist an. Werkzeuge öffnen',

  // ── Filter tabs ───────────────────────────────────────────────────────────
  'filter.all': 'Alle',
  'filter.photos': 'Fotos',
  'filter.videos': 'Videos',

  // ── Section eyebrows ──────────────────────────────────────────────────────
  'group.justNow': 'Gerade eben',
  'group.earlierToday': 'Früher heute',
  'group.today': 'Heute',
  'group.earlierWeek': 'Früher diese Woche',

  // ── Tiles ─────────────────────────────────────────────────────────────────
  'tile.new': 'neu',
  'tile.saved': 'Gespeichert',
  'tile.video': 'Video',
  'tile.photo': 'Foto',

  // ── Empty states ──────────────────────────────────────────────────────────
  'empty.feedTitle': 'Hier sind keine Status-Updates',
  'empty.feedBody':
    'Sieh dir zuerst einen Status in deiner Messenger-App an und komm dann zurück, er taucht von selbst auf.',
  'empty.libraryTitle': 'Noch nichts gespeichert',
  'empty.libraryBody':
    'Tippe auf einen Status und dann auf Speichern. Alles, was du behältst, landet hier und bleibt auch nach den 24 Stunden.',
  'empty.libraryAccessBody':
    'Gespeicherte Status liegen im Speicher des Telefons. Erlaube den Speicherzugriff, um sie hier zu sehen. Nichts wird hochgeladen; die App hat keine Internetberechtigung.',
  'empty.allowAccess': 'Speicherzugriff erlauben',
  'empty.openFeed': 'Zum Feed',
  'empty.noFolderTitle': 'Noch nichts zu lesen',
  'empty.noFolderBody':
    'Zeige der App den Ordner, in dem deine Messenger-App ihre Status ablegt, und sie erscheinen hier von selbst.',
  'empty.noStorageBody':
    'Status werden aus dem Speicher des Telefons gelesen. Erlaube den Speicherzugriff, und sie erscheinen hier von selbst.',
  'empty.allowStorage': 'Speicherzugriff erlauben',
  'empty.favTitle': 'Noch keine Favoriten',
  'empty.favBody':
    'Tippe bei einem gespeicherten Status auf das Herz, und er erscheint hier.',
  'empty.vaultTitle': 'Der Tresor ist leer',
  'empty.vaultBody':
    'Verschiebe einen gespeicherten Status hierher, damit er aus der Galerie verschwindet.',
  'empty.openWhatsApp': 'Messenger öffnen',

  // ── Library ───────────────────────────────────────────────────────────────
  'library.all': 'Alle gespeicherten',
  'library.fav': 'Favoriten',
  'library.vault': 'Tresor',
  'library.meta_one': '{n} Datei · {size}',
  'library.meta_other': '{n} Dateien · {size}',

  // ── Selection ─────────────────────────────────────────────────────────────
  'select.title': 'Elemente auswählen',
  'select.hint': 'Zum Auswählen antippen',
  'select.count_one': '{n} ausgewählt',
  'select.count_other': '{n} ausgewählt',
  'select.all': 'Alle auswählen',
  'select.clear': 'Aufheben',
  'select.save': 'Speichern',
  'select.saveN': '{n} speichern',
  'select.delete': 'Löschen',
  'select.deleteN': '{n} löschen',
  'select.vault': 'In den Tresor verschieben',
  'select.restore': 'In die Galerie zurücklegen',
  'select.share': 'Teilen',

  // ── Sort sheet ────────────────────────────────────────────────────────────
  'sort.new': 'Neueste zuerst',
  'sort.old': 'Älteste zuerst',
  'sort.big': 'Größte Datei',
  'sort.type': 'Nach Typ gruppieren',

  // ── Tools ─────────────────────────────────────────────────────────────────
  'tools.subtitle': 'automatisierung & speicher',
  'tools.autoSave': 'Automatisch speichern',
  'tools.autoTitle': 'Neue Status-Updates für mich speichern',
  'tools.autoSub': 'Läuft beim Öffnen der App. Nichts verlässt das Gerät.',
  'tools.whatToKeep': 'Was behalten',
  'tools.modeBoth': 'Alles',
  'tools.modePhotos': 'Fotos',
  'tools.modeVideos': 'Videos',
  'tools.autoVault': 'Direkt in den Tresor',
  'tools.whereSaves': 'Wohin gespeichert wird',
  'tools.saveFolder': 'Speicherordner',
  'tools.savePath': 'DCIM / Status',
  'tools.savePathLegacy': 'Pictures und Movies / Status',
  'tools.change': 'Ändern',
  'tools.storage': 'Speicher',
  'tools.usedTotal': '{size} gesichert',
  'tools.storageReading': 'Speicher wird gelesen…',
  'tools.filesKept_one': '{n} Datei',
  'tools.filesKept_other': '{n} Dateien',
  'tools.photosShare': 'Fotos {size}',
  'tools.videosShare': 'Videos {size}',
  'tools.message': 'Nummer anschreiben',
  'tools.dmBody':
    'Öffne einen Chat mit einer beliebigen Nummer, ohne sie in deinen Kontakten zu speichern.',
  'tools.dialCode': 'Ländervorwahl',
  'tools.phonePlaceholder': 'Telefonnummer',
  'tools.openChat': 'Chat öffnen',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Einstellungen',
  'settings.aboutCard':
    'Jede Funktion ist an, kostenlos, für immer. Keine Werbung, keine Konten, keine Internet-Berechtigung, die App kann deine Daten nirgendwohin senden.',
  'settings.appearance': 'Darstellung',
  'settings.themeLight': 'Hell',
  'settings.themeDark': 'Dunkel',
  'settings.themeSystem': 'System',
  'settings.privacy': 'Privatsphäre',
  'settings.hideRecents': 'In „Zuletzt“ ausblenden',
  'settings.hideRecentsSub': 'App-Vorschau beim Wechseln leer lassen',
  'settings.statusFolder': 'Status-Ordner',
  'settings.folderGranted': 'Android/media · gewährt',
  'settings.folderMissing': 'Noch nicht gewählt · zum Wählen antippen',
  'settings.mediaAccess': 'Speicherzugriff',
  'settings.mediaGranted': 'Erlaubt · alle gespeicherten Status werden gezeigt',
  'settings.mediaMissing':
    'Nicht erlaubt · gespeicherte Status bleiben verborgen',
  'settings.general': 'Allgemein',
  'settings.language': 'Sprache',
  'settings.languagesAvailable': '{n} verfügbar',
  'settings.shareApp': 'App teilen',
  'settings.rate': 'App bewerten',
  'settings.feedback': 'Feedback senden',
  'toast.noStore': 'Keine App kann diesen Link öffnen',
  'toast.metaLink': 'link',
  'feedback.subject': 'Feedback zu Status Saver',
  'settings.help': 'Hilfe',
  'settings.legal': 'Datenschutz & Nutzungsbedingungen',
  'settings.footer': 'Keine Internet-Berechtigung · keine Tracker',
  'settings.madeBy': 'Made with ❤️ by Vaishnav',

  // ── Viewer ────────────────────────────────────────────────────────────────
  'viewer.captured': 'aufgenommen',
  'viewer.size': 'größe',
  'viewer.type': 'typ',
  'viewer.hint':
    'Doppelt auf das Medium tippen zum Speichern · seitlich tippen zum Blättern',
  'viewer.save': 'Speichern',
  'viewer.saved': 'Gespeichert',
  'viewer.delete': 'Löschen',
  'viewer.share': 'Teilen',
  'viewer.repost': 'Reposten',
  'viewer.close': 'Schließen',
  'viewer.zoom': 'Zoom',
  'viewer.favourite': 'Favorit',
  'viewer.play': 'Abspielen',
  'viewer.pause': 'Pause',
  'viewer.counter': '{n} / {total}',
  'viewer.today': 'Heute, {time}',
  'viewer.yesterday': 'Gestern, {time}',

  // ── Batch overlay ─────────────────────────────────────────────────────────
  'batch.title': 'Speichern',
  'batch.body':
    'Originale werden nach Galerie › Status geschrieben. Volle Qualität bleibt erhalten.',
  'batch.progress': '{done} / {total}',

  // ── Toasts ────────────────────────────────────────────────────────────────
  'toast.saved': 'In Galerie › Status gespeichert',
  'toast.savedMany': '{n} Status-Updates gespeichert',
  'toast.alreadySaved': 'Schon in deiner Bibliothek',
  'toast.metaSkip': 'skip',
  'toast.upToDate': 'Auf dem neuesten Stand · gerade eben geprüft',
  'toast.metaScan': 'scan',
  'toast.movedToVault_one': '{n} Status in den Tresor verschoben',
  'toast.movedToVault_other': '{n} Status-Updates in den Tresor verschoben',
  'toast.restored_one': '{n} Status wiederhergestellt',
  'toast.restored_other': '{n} Status-Updates wiederhergestellt',
  'toast.vaultedStillPublic':
    'Im Tresor gesichert, aber die Galerie-Kopie ist noch da',
  'toast.metaPrivate': 'private',
  'toast.shareOpened': 'Teilen-Menü geöffnet',
  'toast.shareOpenedN': 'Teilen-Menü geöffnet · {n} Dateien',
  'toast.metaSystem': 'system',
  'toast.removed_one': 'Aus der Bibliothek entfernt',
  'toast.removed_other': '{n} Status-Updates entfernt',
  'toast.metaDeleted': 'deleted',
  'toast.openingWhatsApp': 'Messenger wird geöffnet',
  'toast.metaHandoff': 'handoff',
  'toast.favAdded': 'Zu Favoriten hinzugefügt',
  'toast.favRemoved': 'Aus Favoriten entfernt',
  'toast.metaLibrary': 'library',
  'toast.reposted': 'Im Messenger geöffnet',
  'toast.metaRepost': 'repost',
  'toast.autoOn': 'Automatisches Speichern eingeschaltet',
  'toast.autoOff': 'Automatisches Speichern ausgeschaltet',
  'toast.metaTools': 'tools',
  'toast.chooseFolder': 'Wähle einen Ordner in Dateien',
  'toast.metaStorage': 'storage',
  'toast.needDigits': 'Gib mindestens 6 Ziffern ein',
  'toast.needDialCode': 'Gib eine Ländervorwahl ein',
  'toast.metaCheck': 'check',
  'toast.openingChat': 'Chat mit {number} wird geöffnet',
  'toast.metaChat': 'chat',
  'toast.lightTheme': 'Helles Design gilt auf dem Gerät',
  'toast.metaTheme': 'theme',
  'toast.folderGranted': 'Ordnerzugriff gewährt',
  'toast.metaSetup': 'setup',
  'toast.saveFailed': 'Dieser Status konnte nicht gespeichert werden',
  'toast.deleteFailed': 'Diese Datei konnte nicht entfernt werden',
  'toast.permissionNeeded': 'Erlaube den Speicherzugriff, um fortzufahren',
  'toast.openSettings': 'Einstellungen öffnen',
  'toast.whatsappMissing': 'Die Messenger-App ist nicht installiert',
  'toast.repostFailed': 'Konnte nicht an die Messenger-App übergeben werden',
  'toast.autoSaved_one': '{n} neuer Status automatisch gespeichert',
  'toast.autoSaved_other': '{n} neue Status-Updates automatisch gespeichert',

  // ── Confirmations ─────────────────────────────────────────────────────────
  'confirm.deleteTitle_one': '{n} Status entfernen?',
  'confirm.deleteTitle_other': '{n} Status-Updates entfernen?',
  'confirm.deleteBody':
    'Sie verlassen deine Bibliothek und die Galerie. Das lässt sich nicht rückgängig machen.',
  'confirm.delete': 'Entfernen',
  'confirm.cancel': 'Behalten',

  // ── Permission guide ──────────────────────────────────────────────────────
  'guide.title': 'Den Ordner wählen',
  'guide.intro':
    'Android zeigt seine eigene Dateiauswahl. Zwei Tipps und du bist fertig.',
  'guide.step1':
    'Öffne in der Auswahl Android › media und tippe auf Diesen Ordner verwenden.',
  'guide.step2':
    'Bestätige mit Zulassen. Der Zugriff ist nur lesend und du kannst ihn jederzeit widerrufen.',
  'guide.open': 'Auswahl öffnen',
  'guide.mockInternal': 'Interner Speicher',
  'guide.mockUseFolder': 'Diesen Ordner verwenden',
  'guide.mockAllowTitle': 'Zugriff auf media zulassen?',
  'guide.mockAllowBody':
    'Damit kann Status Saver die hier zwischengespeicherten Statusdateien lesen.',
  'guide.mockAllow': 'Zulassen',

  // ── Help ──────────────────────────────────────────────────────────────────
  'help.title': 'Hilfe',
  'help.gettingStarted': 'Erste Schritte',
  'help.q1': 'Warum sehe ich keine Status-Updates?',
  'help.a1':
    'Öffne zuerst deine Messenger-App und sieh dir den Status von jemandem an. Status Saver kann nur lesen, was diese App schon auf dieses Handy heruntergeladen hat.',
  'help.q2': 'Wo landen gespeicherte Dateien?',
  'help.a2':
    'In deine Galerie, in ein Album namens Status. Was du als privat markierst, bleibt in Status Saver und erreicht die Galerie nie.',
  'help.q3': 'Merkt die Person, dass ich es gespeichert habe?',
  'help.a3':
    'Nein. Alles passiert auf deinem Gerät und die App kommt nicht ins Internet. Geh trotzdem rücksichtsvoll damit um, was du von anderen weiterteilst.',
  'help.q4': 'Ein Status ist verschwunden. Warum?',
  'help.a4':
    'Zwischengespeicherte Status-Updates werden nach 24 Stunden gelöscht. Speichere die, die du behalten willst, vorher.',
  'help.q5': 'Die Ordnerauswahl lehnt meine Auswahl immer wieder ab.',
  'help.a5':
    'Wähle den Ordner namens media in Android, nicht einen Ordner weiter unten. Status Saver findet den Ordner .Statuses darunter von selbst.',
  'help.troubleshooting': 'Fehlerbehebung',
  'help.resetFolder': 'Status-Ordner erneut wählen',
  'help.resetFolderBody':
    'Nutze das, wenn nach einem Update deiner Messenger-App keine Status-Updates mehr auftauchen.',

  // ── Privacy & terms ───────────────────────────────────────────────────────
  'about.title': 'Datenschutz & Nutzungsbedingungen',
  'about.tagline':
    'Status-Updates ansehen, speichern und teilen, komplett offline.',
  'about.privacyHeading': 'Privatsphäre',
  'about.privacyBody':
    'Status Saver hat keine INTERNET-Berechtigung und kann deshalb nichts irgendwohin senden. Es gibt keine Analyse, keine Werbe-ID und keine Absturzberichte. Die App fragt nie nach „Zugriff auf alle Dateien“. Die Statusdateien, die sie liest, sind die, die deine Messenger-App bereits auf deinem Gerät abgelegt hat.',
  'about.dataHeading': 'Was gespeichert wird',
  'about.dataBody':
    'Deine Einstellungen, deine Sprache, deine Favoriten, die Liste der Status-Updates, die du gespeichert hast, und alles im Tresor. Das alles bleibt auf diesem Gerät und wird gelöscht, wenn du die App deinstallierst. Kopien in deiner Galerie bleiben, bis du sie löschst.',
  'about.termsHeading': 'Nutzungsbedingungen',
  'about.termsBody':
    'Status Saver wird wie besehen bereitgestellt, ohne jede Gewährleistung. Du bist dafür verantwortlich, wie du die Medien nutzt, die du behältst: Respektiere die Privatsphäre der Menschen, die sie gepostet haben, und das Urheberrecht an allem, was du weiterteilst.',
  'about.disclaimer':
    'Status Saver ist eine unabhängige App. Sie ist nicht mit WhatsApp LLC oder Meta Platforms, Inc. verbunden, wird von ihnen nicht unterstützt und steht in keiner Beziehung zu ihnen. WhatsApp und Meta sind Marken ihrer jeweiligen Inhaber. Diese App verändert keine Messenger-App und liest nur die Statusdateien, die bereits auf diesem Gerät liegen.',

  // ── Accessibility labels ──────────────────────────────────────────────────
  'a11y.refresh': 'Aktualisieren',
  'a11y.sort': 'Sortieren nach',
  'a11y.settings': 'Einstellungen',
  'a11y.selectMode': 'Auswählen',
  'a11y.exitSelect': 'Auswahl beenden',
  'a11y.tile': '{kind} {time}',
  'a11y.backToFeed': 'Zurück zum Feed',
};
