import type { Dictionary } from './en';

export const fr: Dictionary = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  'brand.name': 'Status Saver',

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.feed': 'Fil',
  'nav.library': 'Enregistrés',
  'nav.tools': 'Outils',
  'nav.settings': 'Réglages',

  // ── Common ────────────────────────────────────────────────────────────────
  'common.close': 'Fermer',
  'common.cancel': 'Annuler',
  'common.undo': 'Annuler',
  'common.refresh': 'Actualiser',
  'common.sortBy': 'Trier par',
  'common.select': 'Sélectionner',
  'common.retry': 'Réessayer',
  'common.ok': 'OK',

  // ── Error boundary ────────────────────────────────────────────────────────
  'error.title': 'Une erreur est survenue',
  'error.body':
    'L’app a rencontré un problème inattendu et n’a pas pu afficher cet écran. Rien n’est perdu : vos statuts enregistrés sont toujours sur cet appareil.',

  // ── Onboarding ────────────────────────────────────────────────────────────
  // The three first-run intro slides, shown once after install.
  'intro.one.title': 'Tous les statuts, dans une grille.',
  'intro.one.body':
    'Les photos et vidéos que votre appli de messagerie a déjà mises en cache sur ce téléphone, réunies au même endroit.',
  'intro.two.title': 'Gardez ceux qui comptent.',
  'intro.two.body':
    'Un statut disparaît en 24 heures. Enregistrez-le et une copie reste dans votre galerie, dans un dossier nommé Status.',
  'intro.three.title': 'Rien ne quitte votre téléphone.',
  'intro.three.body':
    'Aucun compte, aucune publicité, aucun suivi. L’app n’a pas la permission internet : rien ne peut être envoyé.',
  'intro.next': 'Suivant',
  'intro.start': 'Commencer',
  'intro.skip': 'Passer',
  'intro.progress': 'Écran {n} sur {total}',
  'onboard.title':
    'Indiquez-nous le dossier que votre appli de messagerie utilise déjà.',
  'onboard.body':
    'Nous lisons les fichiers de statut mis en cache sur ce téléphone. Rien n’est envoyé : l’app n’a aucune autorisation Internet.',
  'onboard.step1':
    'Ouvrez votre appli de messagerie et regardez un statut que vous voulez garder.',
  'onboard.step2a': 'Revenez ici et choisissez ',
  'onboard.step2Accent': 'Android › media',
  'onboard.step2b': ' dans le sélecteur affiché par Android.',
  'onboard.step3':
    'C’est fait. L’enregistrement automatique peut ensuite garder chaque nouveau statut.',
  'onboard.note':
    'Accès en lecture seule à un seul dossier. Révocable à tout moment.',
  'onboard.cta': 'Choisir le dossier',
  'onboard.skip': 'Pas maintenant',
  'onboard.granted': 'Accès au dossier accordé',
  'onboard.failed': 'Impossible d’ouvrir ce dossier',

  // ── Feed ──────────────────────────────────────────────────────────────────
  'feed.auto': 'Auto',
  'feed.autoA11y': 'L’enregistrement automatique est activé. Ouvrir les Outils',

  // ── Filter tabs ───────────────────────────────────────────────────────────
  'filter.all': 'Tous',
  'filter.photos': 'Photos',
  'filter.videos': 'Vidéos',

  // ── Section eyebrows ──────────────────────────────────────────────────────
  'group.justNow': 'À l’instant',
  'group.earlierToday': 'Plus tôt aujourd’hui',
  'group.today': 'Aujourd’hui',
  'group.earlierWeek': 'Plus tôt cette semaine',

  // ── Tiles ─────────────────────────────────────────────────────────────────
  'tile.new': 'nouveau',
  'tile.saved': 'Enregistré',
  'tile.video': 'Vidéo',
  'tile.photo': 'Photo',

  // ── Empty states ──────────────────────────────────────────────────────────
  'empty.feedTitle': 'Aucun statut ici',
  'empty.feedBody':
    'Regardez d’abord un statut dans votre appli de messagerie, puis revenez : il apparaîtra tout seul.',
  'empty.libraryTitle': 'Rien d’enregistré pour l’instant',
  'empty.libraryBody':
    'Touchez un statut, puis Enregistrer. Tout ce que vous gardez arrive ici et reste après les 24 heures.',
  'empty.libraryAccessBody':
    'Les statuts enregistrés sont dans le stockage du téléphone. Autorisez l’accès au stockage pour les voir ici. Rien n’est envoyé ; l’app n’a pas la permission internet.',
  'empty.allowAccess': 'Autoriser l’accès au stockage',
  'empty.openFeed': 'Aller au fil',
  'empty.noFolderTitle': 'Rien à lire pour l’instant',
  'empty.noFolderBody':
    'Indiquez à l’app le dossier où votre appli de messagerie garde ses statuts et ils apparaîtront ici d’eux-mêmes.',
  'empty.noStorageBody':
    'Les statuts sont lus depuis le stockage du téléphone. Autorisez l’accès au stockage et ils apparaîtront ici d’eux-mêmes.',
  'empty.allowStorage': 'Autoriser l’accès au stockage',
  'empty.favTitle': 'Aucun favori pour l’instant',
  'empty.favBody':
    'Touchez le cœur sur un statut enregistré et il apparaîtra ici.',
  'empty.vaultTitle': 'Le coffre est vide',
  'empty.vaultBody':
    'Déplacez ici un statut enregistré pour le garder hors de la galerie.',
  'empty.openWhatsApp': 'Ouvrir la messagerie',

  // ── Library ───────────────────────────────────────────────────────────────
  'library.all': 'Tous les enregistrés',
  'library.fav': 'Favoris',
  'library.vault': 'Coffre',
  'library.meta_one': '{n} fichier · {size}',
  'library.meta_other': '{n} fichiers · {size}',

  // ── Selection ─────────────────────────────────────────────────────────────
  'select.title': 'Sélectionner des éléments',
  'select.hint': 'Touchez pour choisir',
  'select.count_one': '{n} sélectionné',
  'select.count_other': '{n} sélectionnés',
  'select.all': 'Tout sélectionner',
  'select.clear': 'Effacer',
  'select.save': 'Enregistrer',
  'select.saveN': 'Enregistrer {n}',
  'select.delete': 'Supprimer',
  'select.deleteN': 'Supprimer {n}',
  'select.vault': 'Déplacer vers le Coffre',
  'select.restore': 'Restaurer dans la galerie',
  'select.share': 'Partager',

  // ── Sort sheet ────────────────────────────────────────────────────────────
  'sort.new': 'Plus récents d’abord',
  'sort.old': 'Plus anciens d’abord',
  'sort.big': 'Fichier le plus volumineux',
  'sort.type': 'Grouper par type',

  // ── Tools ─────────────────────────────────────────────────────────────────
  'tools.subtitle': 'automatisation et stockage',
  'tools.autoSave': 'Enregistrement automatique',
  'tools.autoTitle': 'Enregistrer les nouveaux statuts pour moi',
  'tools.autoSub':
    'S’exécute à l’ouverture de l’app. Rien ne quitte l’appareil.',
  'tools.whatToKeep': 'Que garder',
  'tools.modeBoth': 'Tout',
  'tools.modePhotos': 'Photos',
  'tools.modeVideos': 'Vidéos',
  'tools.autoVault': 'Envoyer directement dans le Coffre',
  'tools.whereSaves': 'Où vont les enregistrements',
  'tools.saveFolder': 'Dossier d’enregistrement',
  'tools.savePath': 'DCIM / Status',
  'tools.savePathLegacy': 'Pictures et Movies / Status',
  'tools.change': 'Modifier',
  'tools.storage': 'Stockage',
  'tools.usedTotal': '{size} conservés',
  'tools.storageReading': 'Lecture du stockage…',
  'tools.filesKept_one': '{n} fichier',
  'tools.filesKept_other': '{n} fichiers',
  'tools.photosShare': 'Photos {size}',
  'tools.videosShare': 'Vidéos {size}',
  'tools.message': 'Écrire à un numéro',
  'tools.dmBody':
    'Ouvrez une discussion avec n’importe quel numéro sans l’enregistrer dans vos contacts.',
  'tools.dialCode': 'Indicatif du pays',
  'tools.phonePlaceholder': 'Numéro de téléphone',
  'tools.openChat': 'Ouvrir la discussion',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Réglages',
  'settings.aboutCard':
    'Toutes les fonctions sont actives, gratuites, pour toujours. Pas de publicité, pas de compte, pas d’autorisation Internet : l’app ne peut envoyer vos données nulle part.',
  'settings.appearance': 'Apparence',
  'settings.themeLight': 'Clair',
  'settings.themeDark': 'Sombre',
  'settings.themeSystem': 'Système',
  'settings.privacy': 'Confidentialité',
  'settings.hideRecents': 'Masquer dans les récents',
  'settings.hideRecentsSub': 'Aperçu de l’app vide lors du changement d’app',
  'settings.statusFolder': 'Dossier des statuts',
  'settings.folderGranted': 'Android/media · accordé',
  'settings.folderMissing': 'Pas encore choisi · touchez pour choisir',
  'settings.mediaAccess': 'Accès au stockage',
  'settings.mediaGranted': 'Autorisé · tous les enregistrements s’affichent',
  'settings.mediaMissing': 'Refusé · les enregistrements restent masqués',
  'settings.general': 'Général',
  'settings.language': 'Langue',
  'settings.languagesAvailable': '{n} disponibles',
  'settings.shareApp': 'Partager l’app',
  'settings.rate': 'Noter l’application',
  'settings.feedback': 'Envoyer un commentaire',
  'toast.noStore': 'Aucune app ne peut ouvrir ce lien',
  'toast.metaLink': 'link',
  'feedback.subject': 'Commentaires sur Status Saver',
  'settings.help': 'Aide',
  'settings.legal': 'Confidentialité et conditions',
  'settings.footer': 'Aucune autorisation Internet · aucun traceur',
  'settings.madeBy': 'Made with ❤️ by Vaishnav',

  // ── Viewer ────────────────────────────────────────────────────────────────
  'viewer.captured': 'capturé',
  'viewer.size': 'taille',
  'viewer.type': 'type',
  'viewer.hint':
    'Touchez deux fois le média pour enregistrer · touchez les côtés pour naviguer',
  'viewer.save': 'Enregistrer',
  'viewer.saved': 'Enregistré',
  'viewer.delete': 'Supprimer',
  'viewer.share': 'Partager',
  'viewer.repost': 'Republier',
  'viewer.close': 'Fermer',
  'viewer.zoom': 'Zoom',
  'viewer.favourite': 'Favori',
  'viewer.play': 'Lire',
  'viewer.pause': 'Pause',
  'viewer.counter': '{n} / {total}',
  'viewer.today': 'Aujourd’hui, {time}',
  'viewer.yesterday': 'Hier, {time}',

  // ── Batch overlay ─────────────────────────────────────────────────────────
  'batch.title': 'Enregistrement',
  'batch.body':
    'Écriture des originaux dans Galerie › Status. Qualité d’origine conservée.',
  'batch.progress': '{done} / {total}',

  // ── Toasts ────────────────────────────────────────────────────────────────
  'toast.saved': 'Enregistré dans Galerie › Status',
  'toast.savedMany': '{n} statuts enregistrés',
  'toast.alreadySaved': 'Déjà dans votre bibliothèque',
  'toast.metaSkip': 'skip',
  'toast.upToDate': 'À jour · analysé à l’instant',
  'toast.metaScan': 'scan',
  'toast.movedToVault_one': '{n} statut déplacé dans le Coffre',
  'toast.movedToVault_other': '{n} statuts déplacés dans le Coffre',
  'toast.restored_one': '{n} statut restauré',
  'toast.restored_other': '{n} statuts restaurés',
  'toast.vaultedStillPublic':
    'Gardé dans le Coffre, mais la copie de la galerie est toujours là',
  'toast.metaPrivate': 'private',
  'toast.shareOpened': 'Menu de partage ouvert',
  'toast.shareOpenedN': 'Menu de partage ouvert · {n} fichiers',
  'toast.metaSystem': 'system',
  'toast.removed_one': 'Retiré de la bibliothèque',
  'toast.removed_other': '{n} statuts retirés',
  'toast.metaDeleted': 'deleted',
  'toast.openingWhatsApp': 'Ouverture de votre messagerie',
  'toast.metaHandoff': 'handoff',
  'toast.favAdded': 'Ajouté aux Favoris',
  'toast.favRemoved': 'Retiré des Favoris',
  'toast.metaLibrary': 'library',
  'toast.reposted': 'Ouvert dans votre messagerie',
  'toast.metaRepost': 'repost',
  'toast.autoOn': 'Enregistrement automatique activé',
  'toast.autoOff': 'Enregistrement automatique désactivé',
  'toast.metaTools': 'tools',
  'toast.chooseFolder': 'Choisissez un dossier dans Fichiers',
  'toast.metaStorage': 'storage',
  'toast.needDigits': 'Saisissez au moins 6 chiffres',
  'toast.needDialCode': 'Saisissez un indicatif de pays',
  'toast.metaCheck': 'check',
  'toast.openingChat': 'Ouverture d’une discussion avec {number}',
  'toast.metaChat': 'chat',
  'toast.lightTheme': 'Le thème clair s’applique sur l’appareil',
  'toast.metaTheme': 'theme',
  'toast.folderGranted': 'Accès au dossier accordé',
  'toast.metaSetup': 'setup',
  'toast.saveFailed': 'Impossible d’enregistrer ce statut',
  'toast.deleteFailed': 'Impossible de retirer ce fichier',
  'toast.permissionNeeded': 'Autorisez l’accès au stockage pour continuer',
  'toast.openSettings': 'Ouvrir les réglages',
  'toast.whatsappMissing': 'L’appli de messagerie n’est pas installée',
  'toast.repostFailed': 'Impossible de transmettre à l’appli de messagerie',
  'toast.autoSaved_one': '{n} nouveau statut enregistré automatiquement',
  'toast.autoSaved_other': '{n} nouveaux statuts enregistrés automatiquement',

  // ── Confirmations ─────────────────────────────────────────────────────────
  'confirm.deleteTitle_one': 'Retirer {n} statut ?',
  'confirm.deleteTitle_other': 'Retirer {n} statuts ?',
  'confirm.deleteBody':
    'Ils quittent votre bibliothèque et la galerie. Cette action est définitive.',
  'confirm.delete': 'Retirer',
  'confirm.cancel': 'Garder',

  // ── Permission guide ──────────────────────────────────────────────────────
  'guide.title': 'Choisir le dossier',
  'guide.intro':
    'Android affiche son propre sélecteur de fichiers. Deux touches et c’est fait.',
  'guide.step1':
    'Dans le sélecteur, ouvrez Android › media et touchez Utiliser ce dossier.',
  'guide.step2':
    'Confirmez avec Autoriser. L’accès est en lecture seule et vous pouvez le révoquer à tout moment.',
  'guide.open': 'Ouvrir le sélecteur',
  'guide.mockInternal': 'Stockage interne',
  'guide.mockUseFolder': 'Utiliser ce dossier',
  'guide.mockAllowTitle': 'Autoriser l’accès à media ?',
  'guide.mockAllowBody':
    'Cela permet à Status Saver de lire les fichiers de statut mis en cache ici.',
  'guide.mockAllow': 'Autoriser',

  // ── Help ──────────────────────────────────────────────────────────────────
  'help.title': 'Aide',
  'help.gettingStarted': 'Premiers pas',
  'help.q1': 'Pourquoi ne vois-je aucun statut ?',
  'help.a1':
    'Ouvrez d’abord votre appli de messagerie et regardez le statut de quelqu’un. Status Saver ne peut lire que ce que cette appli a déjà téléchargé sur ce téléphone.',
  'help.q2': 'Où vont les fichiers enregistrés ?',
  'help.a2':
    'Dans votre galerie, dans un album nommé Status. Ce que vous marquez comme privé reste dans Status Saver et n’atteint jamais la galerie.',
  'help.q3': 'La personne sait-elle que je l’ai enregistré ?',
  'help.a3':
    'Non. Tout se passe sur votre appareil et l’app ne peut pas accéder à Internet. Soyez attentif avant de repartager ce que d’autres publient.',
  'help.q4': 'Un statut a disparu. Pourquoi ?',
  'help.a4':
    'Les statuts mis en cache sont supprimés au bout de 24 heures. Enregistrez avant ce délai ceux que vous voulez garder.',
  'help.q5': 'Le sélecteur de dossier refuse mon choix.',
  'help.a5':
    'Choisissez le dossier nommé media dans Android, pas un dossier situé plus bas. Status Saver y trouve le dossier .Statuses tout seul.',
  'help.troubleshooting': 'Dépannage',
  'help.resetFolder': 'Choisir à nouveau le dossier des statuts',
  'help.resetFolderBody':
    'Utilisez ceci si les statuts ont cessé d’apparaître après une mise à jour de votre appli de messagerie.',

  // ── Privacy & terms ───────────────────────────────────────────────────────
  'about.title': 'Confidentialité et conditions',
  'about.tagline':
    'Consultez, enregistrez et partagez les statuts, entièrement hors ligne.',
  'about.privacyHeading': 'Confidentialité',
  'about.privacyBody':
    'Status Saver n’a pas l’autorisation INTERNET : elle ne peut donc rien envoyer nulle part. Il n’y a ni analyse d’audience, ni identifiant publicitaire, ni rapport de plantage. Elle ne demande jamais l’« accès à tous les fichiers ». Les fichiers de statut qu’elle lit sont ceux que votre appli de messagerie a déjà stockés sur votre appareil.',
  'about.dataHeading': 'Ce qui est stocké',
  'about.dataBody':
    'Vos réglages, votre langue, vos favoris, la liste des statuts que vous avez enregistrés et tout ce qui se trouve dans le Coffre. Tout cela reste sur cet appareil et est supprimé lorsque vous désinstallez l’app. Les copies enregistrées dans votre galerie restent jusqu’à ce que vous les supprimiez.',
  'about.termsHeading': 'Conditions',
  'about.termsBody':
    'Status Saver est fourni tel quel, sans aucune garantie. Vous êtes responsable de l’usage que vous faites des médias que vous conservez : respectez la vie privée des personnes qui les ont publiés et les droits d’auteur de tout ce que vous repartagez.',
  'about.disclaimer':
    'Status Saver est une app indépendante. Elle n’est ni affiliée à WhatsApp LLC ou Meta Platforms, Inc., ni approuvée par eux, ni liée à eux. WhatsApp et Meta sont des marques de leurs propriétaires respectifs. Cette app ne modifie aucune appli de messagerie et ne lit que les fichiers de statut déjà stockés sur cet appareil.',

  // ── Accessibility labels ──────────────────────────────────────────────────
  'a11y.refresh': 'Actualiser',
  'a11y.sort': 'Trier par',
  'a11y.settings': 'Réglages',
  'a11y.selectMode': 'Sélectionner',
  'a11y.exitSelect': 'Quitter la sélection',
  'a11y.tile': '{kind} {time}',
  'a11y.backToFeed': 'Retour au fil',
};
