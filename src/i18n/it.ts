import type { Dictionary } from './en';

export const it: Dictionary = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  'brand.name': 'Status Saver',

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.feed': 'Feed',
  'nav.library': 'Salvati',
  'nav.tools': 'Strumenti',
  'nav.settings': 'Impostazioni',

  // ── Common ────────────────────────────────────────────────────────────────
  'common.close': 'Chiudi',
  'common.cancel': 'Annulla',
  'common.undo': 'Annulla',
  'common.refresh': 'Aggiorna',
  'common.sortBy': 'Ordina per',
  'common.select': 'Seleziona',
  'common.retry': 'Riprova',
  'common.ok': 'OK',

  // ── Error boundary ────────────────────────────────────────────────────────
  'error.title': 'Qualcosa è andato storto',
  'error.body':
    'L’app ha riscontrato un problema inatteso e ha smesso di disegnare questa schermata. Non è andato perso nulla: gli stati salvati sono ancora su questo dispositivo.',

  // ── Onboarding ────────────────────────────────────────────────────────────
  // The three first-run intro slides, shown once after install.
  'intro.one.title': 'Tutti gli stati, in una griglia.',
  'intro.one.body':
    'Le foto e i video che la tua app di messaggistica ha già memorizzato su questo telefono, raccolti in un unico posto.',
  'intro.two.title': 'Tieni quelli che contano.',
  'intro.two.body':
    'Uno stato sparisce in 24 ore. Salvalo e una copia resta nella tua galleria, in una cartella chiamata Status.',
  'intro.three.title': 'Non lascia mai il telefono.',
  'intro.three.body':
    'Nessun account, nessuna pubblicità, nessun tracciamento. L’app non ha il permesso internet: nulla può essere caricato.',
  'intro.next': 'Avanti',
  'intro.start': 'Iniziamo',
  'intro.skip': 'Salta',
  'intro.progress': 'Schermata {n} di {total}',
  'onboard.title':
    'Indicaci la cartella che la tua app di messaggistica usa già.',
  'onboard.body':
    'Leggiamo i file di stato in cache su questo telefono. Nulla viene caricato online: l’app non ha alcun permesso internet.',
  'onboard.step1':
    'Apri la tua app di messaggistica e guarda uno stato che vuoi conservare.',
  'onboard.step2a': 'Torna qui e scegli ',
  'onboard.step2Accent': 'Android › media',
  'onboard.step2b': ' nel selettore mostrato da Android.',
  'onboard.step3':
    'Fatto. Da lì in avanti il salvataggio automatico può conservare ogni nuovo stato.',
  'onboard.note':
    'Accesso in sola lettura a una cartella. Revocabile in qualsiasi momento.',
  'onboard.cta': 'Scegli cartella',
  'onboard.skip': 'Non ora',
  'onboard.granted': 'Accesso alla cartella concesso',
  'onboard.failed': 'Impossibile aprire quella cartella',

  // ── Feed ──────────────────────────────────────────────────────────────────
  'feed.auto': 'Auto',
  'feed.autoA11y': 'Il salvataggio automatico è attivo. Apri Strumenti',

  // ── Filter tabs ───────────────────────────────────────────────────────────
  'filter.all': 'Tutti',
  'filter.photos': 'Foto',
  'filter.videos': 'Video',

  // ── Section eyebrows ──────────────────────────────────────────────────────
  'group.justNow': 'Adesso',
  'group.earlierToday': 'Prima oggi',
  'group.today': 'Oggi',
  'group.earlierWeek': 'Prima in settimana',

  // ── Tiles ─────────────────────────────────────────────────────────────────
  'tile.new': 'nuovo',
  'tile.saved': 'Salvato',
  'tile.video': 'Video',
  'tile.photo': 'Foto',

  // ── Empty states ──────────────────────────────────────────────────────────
  'empty.feedTitle': 'Nessuno stato qui',
  'empty.feedBody':
    'Guarda prima uno stato nella tua app di messaggistica, poi torna qui: comparirà da solo.',
  'empty.libraryTitle': 'Ancora niente di salvato',
  'empty.libraryBody':
    'Tocca uno stato, poi Salva. Tutto ciò che conservi finisce qui e resta anche dopo le 24 ore.',
  'empty.libraryAccessBody':
    'Gli stati salvati sono nella memoria del telefono. Consenti l’accesso alla memoria per vederli qui. Nulla viene caricato; l’app non ha il permesso internet.',
  'empty.allowAccess': 'Consenti accesso alla memoria',
  'empty.openFeed': 'Vai al feed',
  'empty.noFolderTitle': 'Ancora niente da leggere',
  'empty.noFolderBody':
    'Indica all’app la cartella in cui la tua app di messaggistica tiene gli stati e compariranno qui da soli.',
  'empty.noStorageBody':
    'Gli stati vengono letti dalla memoria del telefono. Consenti l’accesso alla memoria e compariranno qui da soli.',
  'empty.allowStorage': 'Consenti accesso all’archivio',
  'empty.favTitle': 'Ancora nessun preferito',
  'empty.favBody': 'Tocca il cuore su uno stato salvato e comparirà qui.',
  'empty.vaultTitle': 'La cassaforte è vuota',
  'empty.vaultBody':
    'Sposta qui uno stato salvato per tenerlo fuori dalla galleria.',
  'empty.openWhatsApp': 'Apri l’app di messaggistica',

  // ── Library ───────────────────────────────────────────────────────────────
  'library.all': 'Tutti i salvati',
  'library.fav': 'Preferiti',
  'library.vault': 'Cassaforte',
  'library.meta_one': '{n} file · {size}',
  'library.meta_other': '{n} file · {size}',

  // ── Selection ─────────────────────────────────────────────────────────────
  'select.title': 'Seleziona elementi',
  'select.hint': 'Tocca per scegliere',
  'select.count_one': '{n} selezionato',
  'select.count_other': '{n} selezionati',
  'select.all': 'Seleziona tutto',
  'select.clear': 'Deseleziona',
  'select.save': 'Salva',
  'select.saveN': 'Salva {n}',
  'select.delete': 'Elimina',
  'select.deleteN': 'Elimina {n}',
  'select.vault': 'Sposta in Cassaforte',
  'select.restore': 'Ripristina nella galleria',
  'select.share': 'Condividi',

  // ── Sort sheet ────────────────────────────────────────────────────────────
  'sort.new': 'Prima i più recenti',
  'sort.old': 'Prima i più vecchi',
  'sort.big': 'File più grande',
  'sort.type': 'Raggruppa per tipo',

  // ── Tools ─────────────────────────────────────────────────────────────────
  'tools.subtitle': 'automazione e archiviazione',
  'tools.autoSave': 'Salvataggio automatico',
  'tools.autoTitle': 'Salva i nuovi stati per me',
  'tools.autoSub': 'Si attiva quando apri l’app. Nulla lascia il dispositivo.',
  'tools.whatToKeep': 'Cosa conservare',
  'tools.modeBoth': 'Tutto',
  'tools.modePhotos': 'Foto',
  'tools.modeVideos': 'Video',
  'tools.autoVault': 'Manda direttamente in Cassaforte',
  'tools.whereSaves': 'Dove finiscono i salvataggi',
  'tools.saveFolder': 'Cartella di salvataggio',
  'tools.savePath': 'DCIM / Status',
  'tools.savePathLegacy': 'Pictures e Movies / Status',
  'tools.change': 'Cambia',
  'tools.storage': 'Spazio',
  'tools.usedTotal': '{size} conservati',
  'tools.storageReading': 'Lettura della memoria…',
  'tools.filesKept_one': '{n} file',
  'tools.filesKept_other': '{n} file',
  'tools.photosShare': 'Foto {size}',
  'tools.videosShare': 'Video {size}',
  'tools.message': 'Scrivi a un numero',
  'tools.dmBody':
    'Apri una chat con qualsiasi numero senza salvarlo nei contatti.',
  'tools.dialCode': 'Prefisso internazionale',
  'tools.phonePlaceholder': 'Numero di telefono',
  'tools.openChat': 'Apri chat',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Impostazioni',
  'settings.aboutCard':
    'Ogni funzione è attiva, gratis, per sempre. Niente pubblicità, niente account, niente permesso internet: l’app non può inviare i tuoi dati da nessuna parte.',
  'settings.appearance': 'Aspetto',
  'settings.themeLight': 'Chiaro',
  'settings.themeDark': 'Scuro',
  'settings.themeSystem': 'Sistema',
  'settings.privacy': 'Privacy',
  'settings.hideRecents': 'Nascondi nelle app recenti',
  'settings.hideRecentsSub': 'Anteprima dell’app vuota quando cambi app',
  'settings.statusFolder': 'Cartella degli stati',
  'settings.folderGranted': 'Android/media · concesso',
  'settings.folderMissing': 'Non ancora scelta · tocca per scegliere',
  'settings.mediaAccess': 'Accesso alla memoria',
  'settings.mediaGranted': 'Consentito · tutti i salvataggi sono visibili',
  'settings.mediaMissing': 'Non consentito · i salvataggi restano nascosti',
  'settings.general': 'Generali',
  'settings.language': 'Lingua',
  'settings.languagesAvailable': '{n} disponibili',
  'settings.shareApp': 'Condividi l’app',
  'settings.rate': 'Valuta l’app',
  'settings.feedback': 'Invia un commento',
  'toast.noStore': 'Nessuna app può aprire quel link',
  'toast.metaLink': 'link',
  'feedback.subject': 'Commenti su Status Saver',
  'settings.help': 'Aiuto',
  'settings.legal': 'Privacy e termini',
  'settings.footer': 'Nessun permesso internet · nessun tracker',
  'settings.madeBy': 'Made with ❤️ by Vaishnav',

  // ── Viewer ────────────────────────────────────────────────────────────────
  'viewer.captured': 'acquisito',
  'viewer.size': 'dimensione',
  'viewer.type': 'tipo',
  'viewer.hint':
    'Tocca due volte il contenuto per salvare · tocca i lati per spostarti',
  'viewer.save': 'Salva',
  'viewer.saved': 'Salvato',
  'viewer.delete': 'Elimina',
  'viewer.share': 'Condividi',
  'viewer.repost': 'Ripubblica',
  'viewer.close': 'Chiudi',
  'viewer.zoom': 'Zoom',
  'viewer.favourite': 'Preferito',
  'viewer.play': 'Riproduci',
  'viewer.pause': 'Pausa',
  'viewer.counter': '{n} / {total}',
  'viewer.today': 'Oggi, {time}',
  'viewer.yesterday': 'Ieri, {time}',

  // ── Batch overlay ─────────────────────────────────────────────────────────
  'batch.title': 'Salvataggio',
  'batch.body':
    'Scrittura degli originali in Galleria › Status. Qualità piena conservata.',
  'batch.progress': '{done} / {total}',

  // ── Toasts ────────────────────────────────────────────────────────────────
  'toast.saved': 'Salvato in Galleria › Status',
  'toast.savedMany': '{n} stati salvati',
  'toast.alreadySaved': 'Già nella tua libreria',
  'toast.metaSkip': 'skip',
  'toast.upToDate': 'Tutto aggiornato · controllato proprio ora',
  'toast.metaScan': 'scan',
  'toast.movedToVault_one': '{n} stato spostato in Cassaforte',
  'toast.movedToVault_other': '{n} stati spostati in Cassaforte',
  'toast.restored_one': '{n} stato ripristinato',
  'toast.restored_other': '{n} stati ripristinati',
  'toast.vaultedStillPublic':
    'Tenuto in Cassaforte, ma la copia in galleria è ancora lì',
  'toast.metaPrivate': 'private',
  'toast.shareOpened': 'Menu di condivisione aperto',
  'toast.shareOpenedN': 'Menu di condivisione aperto · {n} file',
  'toast.metaSystem': 'system',
  'toast.removed_one': 'Rimosso dalla libreria',
  'toast.removed_other': '{n} stati rimossi',
  'toast.metaDeleted': 'deleted',
  'toast.openingWhatsApp': 'Apertura dell’app di messaggistica',
  'toast.metaHandoff': 'handoff',
  'toast.favAdded': 'Aggiunto ai Preferiti',
  'toast.favRemoved': 'Rimosso dai Preferiti',
  'toast.metaLibrary': 'library',
  'toast.reposted': 'Aperto nell’app di messaggistica',
  'toast.metaRepost': 'repost',
  'toast.autoOn': 'Salvataggio automatico attivato',
  'toast.autoOff': 'Salvataggio automatico disattivato',
  'toast.metaTools': 'tools',
  'toast.chooseFolder': 'Scegli una cartella in File',
  'toast.metaStorage': 'storage',
  'toast.needDigits': 'Inserisci almeno 6 cifre',
  'toast.needDialCode': 'Inserisci un prefisso internazionale',
  'toast.metaCheck': 'check',
  'toast.openingChat': 'Apertura di una chat con {number}',
  'toast.metaChat': 'chat',
  'toast.lightTheme': 'Il tema chiaro si applica sul dispositivo',
  'toast.metaTheme': 'theme',
  'toast.folderGranted': 'Accesso alla cartella concesso',
  'toast.metaSetup': 'setup',
  'toast.saveFailed': 'Impossibile salvare quello stato',
  'toast.deleteFailed': 'Impossibile rimuovere quel file',
  'toast.permissionNeeded': 'Consenti l’accesso alla memoria per continuare',
  'toast.openSettings': 'Apri impostazioni',
  'toast.whatsappMissing': 'L’app di messaggistica non è installata',
  'toast.repostFailed': 'Impossibile passare all’app di messaggistica',
  'toast.autoSaved_one': '{n} nuovo stato salvato automaticamente',
  'toast.autoSaved_other': '{n} nuovi stati salvati automaticamente',

  // ── Confirmations ─────────────────────────────────────────────────────────
  'confirm.deleteTitle_one': 'Rimuovere {n} stato?',
  'confirm.deleteTitle_other': 'Rimuovere {n} stati?',
  'confirm.deleteBody':
    'Escono dalla tua libreria e dalla galleria. Non si può annullare.',
  'confirm.delete': 'Rimuovi',
  'confirm.cancel': 'Mantieni',

  // ── Permission guide ──────────────────────────────────────────────────────
  'guide.title': 'Scegliere la cartella',
  'guide.intro':
    'Android mostra il suo selettore di file. Due tocchi e hai finito.',
  'guide.step1':
    'Nel selettore apri Android › media e tocca Usa questa cartella.',
  'guide.step2':
    'Conferma con Consenti. L’accesso è in sola lettura e puoi revocarlo in qualsiasi momento.',
  'guide.open': 'Apri il selettore',
  'guide.mockInternal': 'Memoria interna',
  'guide.mockUseFolder': 'Usa questa cartella',
  'guide.mockAllowTitle': 'Consentire l’accesso a media?',
  'guide.mockAllowBody':
    'Permette a Status Saver di leggere i file di stato in cache qui.',
  'guide.mockAllow': 'Consenti',

  // ── Help ──────────────────────────────────────────────────────────────────
  'help.title': 'Aiuto',
  'help.gettingStarted': 'Per iniziare',
  'help.q1': 'Perché non vedo nessuno stato?',
  'help.a1':
    'Apri prima la tua app di messaggistica e guarda lo stato di qualcuno. Status Saver può leggere solo ciò che quell’app ha già scaricato su questo telefono.',
  'help.q2': 'Dove finiscono i file salvati?',
  'help.a2':
    'Nella tua galleria, in un album chiamato Status. Ciò che segni come privato resta dentro Status Saver e non raggiunge mai la galleria.',
  'help.q3': 'La persona sa che l’ho salvato?',
  'help.a3':
    'No. Tutto avviene sul tuo dispositivo e l’app non può accedere a internet. Abbi riguardo quando ricondividi ciò che pubblicano gli altri.',
  'help.q4': 'Uno stato è sparito. Perché?',
  'help.a4':
    'Gli stati in cache vengono eliminati dopo 24 ore. Salva prima di allora quelli che vuoi conservare.',
  'help.q5': 'Il selettore di cartelle continua a rifiutare la mia scelta.',
  'help.a5':
    'Scegli la cartella chiamata media dentro Android, non una cartella più in profondità. Status Saver trova da solo la cartella .Statuses al suo interno.',
  'help.troubleshooting': 'Risoluzione dei problemi',
  'help.resetFolder': 'Scegli di nuovo la cartella degli stati',
  'help.resetFolderBody':
    'Usalo se gli stati hanno smesso di comparire dopo un aggiornamento della tua app di messaggistica.',

  // ── Privacy & terms ───────────────────────────────────────────────────────
  'about.title': 'Privacy e termini',
  'about.tagline':
    'Guarda, salva e condividi gli stati, completamente offline.',
  'about.privacyHeading': 'Privacy',
  'about.privacyBody':
    'Status Saver non ha il permesso INTERNET, quindi non può inviare nulla da nessuna parte. Non c’è alcuna raccolta di dati di utilizzo, nessun ID pubblicitario e nessuna segnalazione di arresti anomali. Non chiede mai l’“accesso a tutti i file”. I file di stato che legge sono quelli che la tua app di messaggistica ha già salvato sul tuo dispositivo.',
  'about.dataHeading': 'Cosa viene conservato',
  'about.dataBody':
    'Le tue impostazioni, la tua lingua, i tuoi preferiti, l’elenco degli stati che hai salvato e tutto ciò che è nella Cassaforte. Tutto questo resta su questo dispositivo e viene eliminato quando disinstalli l’app. Le copie salvate nella galleria restano finché non le elimini.',
  'about.termsHeading': 'Termini',
  'about.termsBody':
    'Status Saver è fornito così com’è, senza alcuna garanzia. Sei responsabile dell’uso che fai dei media che conservi: rispetta la privacy di chi li ha pubblicati e il copyright di ciò che ricondividi.',
  'about.disclaimer':
    'Status Saver è un’app indipendente. Non è affiliata, approvata né collegata a WhatsApp LLC o Meta Platforms, Inc. WhatsApp e Meta sono marchi dei rispettivi proprietari. Questa app non modifica né interferisce con alcuna app di messaggistica: legge solo i file di stato già presenti su questo dispositivo.',

  // ── Accessibility labels ──────────────────────────────────────────────────
  'a11y.refresh': 'Aggiorna',
  'a11y.sort': 'Ordina per',
  'a11y.settings': 'Impostazioni',
  'a11y.selectMode': 'Seleziona',
  'a11y.exitSelect': 'Esci dalla selezione',
  'a11y.tile': '{kind} {time}',
  'a11y.backToFeed': 'Torna al feed',
};
