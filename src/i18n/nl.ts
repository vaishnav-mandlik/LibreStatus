import type { Dictionary } from './en';

export const nl: Dictionary = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  'brand.name': 'Status Saver',

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.feed': 'Feed',
  'nav.library': 'Bewaard',
  'nav.tools': 'Hulpmiddelen',
  'nav.settings': 'Instellingen',

  // ── Common ────────────────────────────────────────────────────────────────
  'common.close': 'Sluiten',
  'common.cancel': 'Annuleren',
  'common.undo': 'Ongedaan maken',
  'common.refresh': 'Vernieuwen',
  'common.sortBy': 'Sorteren op',
  'common.select': 'Selecteren',
  'common.retry': 'Opnieuw proberen',
  'common.ok': 'OK',

  // ── Error boundary ────────────────────────────────────────────────────────
  'error.title': 'Er is iets misgegaan',
  'error.body':
    'De app liep tegen een onverwacht probleem aan en stopte met het tekenen van dit scherm. Er is niets verloren, je opgeslagen statussen staan nog op dit toestel.',

  // ── Onboarding ────────────────────────────────────────────────────────────
  // The three first-run intro slides, shown once after install.
  'intro.one.title': 'Alle statussen, in één raster.',
  'intro.one.body':
    'De foto’s en video’s die je berichten-app al op deze telefoon heeft opgeslagen, bij elkaar op één plek.',
  'intro.two.title': 'Bewaar wat je wilt houden.',
  'intro.two.body':
    'Een status is na 24 uur weg. Bewaar hem en er blijft een kopie in je galerij, in een map met de naam Status.',
  'intro.three.title': 'Het verlaat je telefoon nooit.',
  'intro.three.body':
    'Geen account, geen advertenties, geen tracking. De app heeft geen internetrechten, dus er kan niets worden geüpload.',
  'intro.next': 'Volgende',
  'intro.start': 'Aan de slag',
  'intro.skip': 'Overslaan',
  'intro.progress': 'Scherm {n} van {total}',
  'onboard.title': 'Wijs ons de map aan die je berichten-app al gebruikt.',
  'onboard.body':
    'We lezen de statusbestanden die op deze telefoon in de cache staan. Er wordt niets geüpload, de app heeft helemaal geen internetpermissie.',
  'onboard.step1':
    'Open je berichten-app en bekijk een status die je wilt bewaren.',
  'onboard.step2a': 'Kom hier terug en kies ',
  'onboard.step2Accent': 'Android › media',
  'onboard.step2b': ' in de kiezer die Android toont.',
  'onboard.step3':
    'Klaar. Automatisch opslaan kan vanaf dan elke nieuwe status bewaren.',
  'onboard.note': 'Alleen-lezen toegang tot één map. Altijd in te trekken.',
  'onboard.cta': 'Map kiezen',
  'onboard.skip': 'Niet nu',
  'onboard.granted': 'Toegang tot de map verleend',
  'onboard.failed': 'Kon die map niet openen',

  // ── Feed ──────────────────────────────────────────────────────────────────
  'feed.auto': 'Auto',
  'feed.autoA11y': 'Automatisch opslaan staat aan. Hulpmiddelen openen',

  // ── Filter tabs ───────────────────────────────────────────────────────────
  'filter.all': 'Alles',
  'filter.photos': 'Foto’s',
  'filter.videos': 'Video’s',

  // ── Section eyebrows ──────────────────────────────────────────────────────
  'group.justNow': 'Zojuist',
  'group.earlierToday': 'Eerder vandaag',
  'group.today': 'Vandaag',
  'group.earlierWeek': 'Eerder deze week',

  // ── Tiles ─────────────────────────────────────────────────────────────────
  'tile.new': 'nieuw',
  'tile.saved': 'Opgeslagen',
  'tile.video': 'Video',
  'tile.photo': 'Foto',

  // ── Empty states ──────────────────────────────────────────────────────────
  'empty.feedTitle': 'Geen statussen hier',
  'empty.feedBody':
    'Bekijk eerst een status in je berichten-app en kom dan terug, hij verschijnt vanzelf.',
  'empty.libraryTitle': 'Nog niets opgeslagen',
  'empty.libraryBody':
    'Tik op een status en dan op Opslaan. Alles wat je bewaart komt hier terecht en blijft staan nadat de 24 uur voorbij zijn.',
  'empty.libraryAccessBody':
    'Bewaarde statussen staan in de opslag van je telefoon. Geef toegang tot de opslag om ze hier te zien. Er wordt niets geüpload; de app heeft geen internetrechten.',
  'empty.allowAccess': 'Toegang tot opslag toestaan',
  'empty.openFeed': 'Naar de feed',
  'empty.noFolderTitle': 'Nog niets te lezen',
  'empty.noFolderBody':
    'Wijs de app de map aan waarin je berichten-app zijn statussen bewaart, en ze verschijnen hier vanzelf.',
  'empty.noStorageBody':
    'Statussen worden uit de opslag van je telefoon gelezen. Geef toegang tot de opslag en ze verschijnen hier vanzelf.',
  'empty.allowStorage': 'Opslagtoegang toestaan',
  'empty.favTitle': 'Nog geen favorieten',
  'empty.favBody':
    'Tik op het hartje bij een bewaarde status en hij verschijnt hier.',
  'empty.vaultTitle': 'De kluis is leeg',
  'empty.vaultBody':
    'Verplaats een bewaarde status hierheen om hem uit je galerij te houden.',
  'empty.openWhatsApp': 'Berichten-app openen',

  // ── Library ───────────────────────────────────────────────────────────────
  'library.all': 'Alles opgeslagen',
  'library.fav': 'Favorieten',
  'library.vault': 'Kluis',
  'library.meta_one': '{n} bestand · {size}',
  'library.meta_other': '{n} bestanden · {size}',

  // ── Selection ─────────────────────────────────────────────────────────────
  'select.title': 'Items selecteren',
  'select.hint': 'Tik om te kiezen',
  'select.count_one': '{n} geselecteerd',
  'select.count_other': '{n} geselecteerd',
  'select.all': 'Alles selecteren',
  'select.clear': 'Wissen',
  'select.save': 'Opslaan',
  'select.saveN': '{n} opslaan',
  'select.delete': 'Verwijderen',
  'select.deleteN': '{n} verwijderen',
  'select.vault': 'Naar de Kluis',
  'select.restore': 'Terug naar galerij',
  'select.share': 'Delen',

  // ── Sort sheet ────────────────────────────────────────────────────────────
  'sort.new': 'Nieuwste eerst',
  'sort.old': 'Oudste eerst',
  'sort.big': 'Grootste bestand',
  'sort.type': 'Groeperen op type',

  // ── Tools ─────────────────────────────────────────────────────────────────
  'tools.subtitle': 'automatisering & opslag',
  'tools.autoSave': 'Automatisch opslaan',
  'tools.autoTitle': 'Nieuwe statussen voor mij opslaan',
  'tools.autoSub':
    'Draait wanneer je de app opent. Er verlaat niets het apparaat.',
  'tools.whatToKeep': 'Wat bewaren',
  'tools.modeBoth': 'Alles',
  'tools.modePhotos': 'Foto’s',
  'tools.modeVideos': 'Video’s',
  'tools.autoVault': 'Direct naar de Kluis',
  'tools.whereSaves': 'Waar opslaan terechtkomt',
  'tools.saveFolder': 'Opslagmap',
  'tools.savePath': 'DCIM / Status',
  'tools.savePathLegacy': 'Pictures en Movies / Status',
  'tools.change': 'Wijzigen',
  'tools.storage': 'Opslag',
  'tools.usedTotal': '{size} bewaard',
  'tools.storageReading': 'Opslag wordt gelezen…',
  'tools.filesKept_one': '{n} bestand',
  'tools.filesKept_other': '{n} bestanden',
  'tools.photosShare': 'Foto’s {size}',
  'tools.videosShare': 'Video’s {size}',
  'tools.message': 'Een nummer berichten',
  'tools.dmBody':
    'Open een chat met elk nummer zonder het in je contacten op te slaan.',
  'tools.dialCode': 'Landcode',
  'tools.phonePlaceholder': 'Telefoonnummer',
  'tools.openChat': 'Chat openen',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Instellingen',
  'settings.aboutCard':
    'Elke functie staat aan, gratis, voor altijd. Geen advertenties, geen accounts, geen internetpermissie, de app kan je gegevens nergens naartoe sturen.',
  'settings.appearance': 'Weergave',
  'settings.themeLight': 'Licht',
  'settings.themeDark': 'Donker',
  'settings.themeSystem': 'Systeem',
  'settings.privacy': 'Privacy',
  'settings.hideRecents': 'Verbergen in recente apps',
  'settings.hideRecentsSub': 'Lege app-voorvertoning bij het wisselen',
  'settings.statusFolder': 'Statusmap',
  'settings.folderGranted': 'Android/media · verleend',
  'settings.folderMissing': 'Nog niet gekozen · tik om te kiezen',
  'settings.mediaAccess': 'Toegang tot opslag',
  'settings.mediaGranted':
    'Toegestaan · alle bewaarde statussen worden getoond',
  'settings.mediaMissing':
    'Niet toegestaan · bewaarde statussen blijven verborgen',
  'settings.general': 'Algemeen',
  'settings.language': 'Taal',
  'settings.languagesAvailable': '{n} beschikbaar',
  'settings.shareApp': 'App delen',
  'settings.rate': 'Beoordeel deze app',
  'settings.feedback': 'Feedback sturen',
  'toast.noStore': 'Geen app kan die link openen',
  'toast.metaLink': 'link',
  'feedback.subject': 'Feedback over Status Saver',
  'settings.help': 'Help',
  'settings.legal': 'Privacy & voorwaarden',
  'settings.footer': 'Geen internetpermissie · geen trackers',
  'settings.madeBy': 'Made with ❤️ by Vaishnav',

  // ── Viewer ────────────────────────────────────────────────────────────────
  'viewer.captured': 'vastgelegd',
  'viewer.size': 'grootte',
  'viewer.type': 'type',
  'viewer.hint':
    'Dubbeltik op de media om op te slaan · tik op de zijkanten om te bladeren',
  'viewer.save': 'Opslaan',
  'viewer.saved': 'Opgeslagen',
  'viewer.delete': 'Verwijderen',
  'viewer.share': 'Delen',
  'viewer.repost': 'Reposten',
  'viewer.close': 'Sluiten',
  'viewer.zoom': 'Zoom',
  'viewer.favourite': 'Favoriet',
  'viewer.play': 'Afspelen',
  'viewer.pause': 'Pauzeren',
  'viewer.counter': '{n} / {total}',
  'viewer.today': 'Vandaag, {time}',
  'viewer.yesterday': 'Gisteren, {time}',

  // ── Batch overlay ─────────────────────────────────────────────────────────
  'batch.title': 'Opslaan',
  'batch.body':
    'Originelen worden naar Galerij › Status geschreven. Volledige kwaliteit blijft behouden.',
  'batch.progress': '{done} / {total}',

  // ── Toasts ────────────────────────────────────────────────────────────────
  'toast.saved': 'Opgeslagen in Galerij › Status',
  'toast.savedMany': '{n} statussen opgeslagen',
  'toast.alreadySaved': 'Staat al in je bibliotheek',
  'toast.metaSkip': 'skip',
  'toast.upToDate': 'Bijgewerkt · zojuist gescand',
  'toast.metaScan': 'scan',
  'toast.movedToVault_one': '{n} status naar de Kluis verplaatst',
  'toast.movedToVault_other': '{n} statussen naar de Kluis verplaatst',
  'toast.restored_one': '{n} status teruggezet',
  'toast.restored_other': '{n} statussen teruggezet',
  'toast.vaultedStillPublic':
    'Bewaard in de Kluis, maar de galerijkopie staat er nog',
  'toast.metaPrivate': 'private',
  'toast.shareOpened': 'Deelmenu geopend',
  'toast.shareOpenedN': 'Deelmenu geopend · {n} bestanden',
  'toast.metaSystem': 'system',
  'toast.removed_one': 'Verwijderd uit bibliotheek',
  'toast.removed_other': '{n} statussen verwijderd',
  'toast.metaDeleted': 'deleted',
  'toast.openingWhatsApp': 'Je berichten-app wordt geopend',
  'toast.metaHandoff': 'handoff',
  'toast.favAdded': 'Toegevoegd aan Favorieten',
  'toast.favRemoved': 'Verwijderd uit Favorieten',
  'toast.metaLibrary': 'library',
  'toast.reposted': 'Geopend in je berichten-app',
  'toast.metaRepost': 'repost',
  'toast.autoOn': 'Automatisch opslaan ingeschakeld',
  'toast.autoOff': 'Automatisch opslaan uitgeschakeld',
  'toast.metaTools': 'tools',
  'toast.chooseFolder': 'Kies een map in Bestanden',
  'toast.metaStorage': 'storage',
  'toast.needDigits': 'Voer minstens 6 cijfers in',
  'toast.needDialCode': 'Voer een landnummer in',
  'toast.metaCheck': 'check',
  'toast.openingChat': 'Chat met {number} wordt geopend',
  'toast.metaChat': 'chat',
  'toast.lightTheme': 'Licht thema geldt op het apparaat',
  'toast.metaTheme': 'theme',
  'toast.folderGranted': 'Toegang tot de map verleend',
  'toast.metaSetup': 'setup',
  'toast.saveFailed': 'Kon die status niet opslaan',
  'toast.deleteFailed': 'Kon dat bestand niet verwijderen',
  'toast.permissionNeeded': 'Geef toegang tot de opslag om verder te gaan',
  'toast.openSettings': 'Instellingen openen',
  'toast.whatsappMissing': 'De berichten-app is niet geïnstalleerd',
  'toast.repostFailed': 'Kon dit niet aan de berichten-app doorgeven',
  'toast.autoSaved_one': '{n} nieuwe status automatisch opgeslagen',
  'toast.autoSaved_other': '{n} nieuwe statussen automatisch opgeslagen',

  // ── Confirmations ─────────────────────────────────────────────────────────
  'confirm.deleteTitle_one': '{n} status verwijderen?',
  'confirm.deleteTitle_other': '{n} statussen verwijderen?',
  'confirm.deleteBody':
    'Ze verdwijnen uit je bibliotheek en je galerij. Dit kan niet ongedaan worden gemaakt.',
  'confirm.delete': 'Verwijderen',
  'confirm.cancel': 'Bewaren',

  // ── Permission guide ──────────────────────────────────────────────────────
  'guide.title': 'De map kiezen',
  'guide.intro':
    'Android toont zijn eigen bestandskiezer. Twee tikken en je bent klaar.',
  'guide.step1':
    'Open in de kiezer Android › media en tik op Deze map gebruiken.',
  'guide.step2':
    'Bevestig met Toestaan. De toegang is alleen-lezen en je kunt die altijd intrekken.',
  'guide.open': 'De kiezer openen',
  'guide.mockInternal': 'Interne opslag',
  'guide.mockUseFolder': 'Deze map gebruiken',
  'guide.mockAllowTitle': 'Toegang tot media toestaan?',
  'guide.mockAllowBody':
    'Hiermee kan Status Saver de hier gecachte statusbestanden lezen.',
  'guide.mockAllow': 'Toestaan',

  // ── Help ──────────────────────────────────────────────────────────────────
  'help.title': 'Help',
  'help.gettingStarted': 'Aan de slag',
  'help.q1': 'Waarom zie ik geen statussen?',
  'help.a1':
    'Open eerst je berichten-app en bekijk de status van iemand. Status Saver kan alleen lezen wat die app al naar deze telefoon heeft gedownload.',
  'help.q2': 'Waar komen opgeslagen bestanden terecht?',
  'help.a2':
    'In je galerij, in een album met de naam Status. Wat je als privé markeert, blijft in Status Saver en komt nooit in de galerij.',
  'help.q3': 'Weet de ander dat ik het heb opgeslagen?',
  'help.a3':
    'Nee. Alles gebeurt op je apparaat en de app kan niet bij het internet. Ga zorgvuldig om met het opnieuw delen van wat anderen plaatsen.',
  'help.q4': 'Een status is verdwenen. Hoe kan dat?',
  'help.a4':
    'Statussen in de cache worden na 24 uur verwijderd. Sla de statussen die je wilt bewaren daarvoor op.',
  'help.q5': 'De mappenkiezer blijft mijn keuze weigeren.',
  'help.a5':
    'Kies de map met de naam media in Android, niet een map die dieper ligt. Status Saver vindt de map .Statuses daaronder zelf.',
  'help.troubleshooting': 'Problemen oplossen',
  'help.resetFolder': 'Kies de statusmap opnieuw',
  'help.resetFolderBody':
    'Gebruik dit als statussen niet meer verschijnen na een update van je berichten-app.',

  // ── Privacy & terms ───────────────────────────────────────────────────────
  'about.title': 'Privacy & voorwaarden',
  'about.tagline': 'Bekijk, bewaar en deel statussen, volledig offline.',
  'about.privacyHeading': 'Privacy',
  'about.privacyBody':
    'Status Saver heeft geen INTERNET-permissie en kan dus niets ergens naartoe sturen. Er is geen analytics, geen advertentie-ID en geen crashrapportage. De app vraagt nooit om “toegang tot alle bestanden”. De statusbestanden die de app leest, zijn de bestanden die je berichten-app al op je toestel heeft opgeslagen.',
  'about.dataHeading': 'Wat er wordt bewaard',
  'about.dataBody':
    'Je instellingen, je taal, je favorieten, de lijst met statussen die je hebt opgeslagen en alles in de Kluis. Dat alles blijft op dit apparaat en wordt verwijderd wanneer je de app verwijdert. Kopieën in je galerij blijven staan tot je ze zelf verwijdert.',
  'about.termsHeading': 'Voorwaarden',
  'about.termsBody':
    'Status Saver wordt geleverd zoals het is, zonder enige garantie. Je bent zelf verantwoordelijk voor wat je doet met de media die je bewaart: respecteer de privacy van de mensen die ze hebben geplaatst en het auteursrecht op alles wat je opnieuw deelt.',
  'about.disclaimer':
    'Status Saver is een onafhankelijke app. Hij is niet gelieerd aan, onderschreven door of verbonden met WhatsApp LLC of Meta Platforms, Inc. WhatsApp en Meta zijn handelsmerken van hun respectieve eigenaren. Deze app wijzigt geen enkele berichten-app en leest alleen de statusbestanden die al op dit toestel staan.',

  // ── Accessibility labels ──────────────────────────────────────────────────
  'a11y.refresh': 'Vernieuwen',
  'a11y.sort': 'Sorteren op',
  'a11y.settings': 'Instellingen',
  'a11y.selectMode': 'Selecteren',
  'a11y.exitSelect': 'Selectie verlaten',
  'a11y.tile': '{kind} {time}',
  'a11y.backToFeed': 'Terug naar feed',
};
