import type { Dictionary } from './en';

export const es: Dictionary = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  'brand.name': 'Status Saver',

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.feed': 'Feed',
  'nav.library': 'Guardados',
  'nav.tools': 'Herramientas',
  'nav.settings': 'Ajustes',

  // ── Common ────────────────────────────────────────────────────────────────
  'common.close': 'Cerrar',
  'common.cancel': 'Cancelar',
  'common.undo': 'Deshacer',
  'common.refresh': 'Actualizar',
  'common.sortBy': 'Ordenar por',
  'common.select': 'Seleccionar',
  'common.retry': 'Reintentar',
  'common.ok': 'Aceptar',

  // ── Error boundary ────────────────────────────────────────────────────────
  'error.title': 'Algo ha ido mal',
  'error.body':
    'La aplicación ha tenido un problema inesperado y ha dejado de dibujar esta pantalla. No se ha perdido nada: tus estados guardados siguen en este dispositivo.',

  // ── Onboarding ────────────────────────────────────────────────────────────
  // The three first-run intro slides, shown once after install.
  'intro.one.title': 'Todos los estados, en una cuadrícula.',
  'intro.one.body':
    'Las fotos y los vídeos que tu app de mensajería ya guardó en este teléfono, reunidos en un solo sitio.',
  'intro.two.title': 'Guarda los que merezcan la pena.',
  'intro.two.body':
    'Un estado desaparece en 24 horas. Guárdalo y quedará una copia en tu galería, en una carpeta llamada Status.',
  'intro.three.title': 'Nunca sale de tu teléfono.',
  'intro.three.body':
    'Sin cuenta, sin anuncios, sin rastreo. La app no tiene permiso de internet, así que nada puede subirse.',
  'intro.next': 'Siguiente',
  'intro.start': 'Empezar',
  'intro.skip': 'Omitir',
  'intro.progress': 'Pantalla {n} de {total}',
  'onboard.title': 'Indícanos la carpeta que tu app de mensajería ya usa.',
  'onboard.body':
    'Leemos los archivos de estado guardados en caché en este teléfono. No se sube nada: la app no tiene permiso de internet en absoluto.',
  'onboard.step1':
    'Abre tu app de mensajería y mira un estado que quieras conservar.',
  'onboard.step2a': 'Vuelve aquí y elige ',
  'onboard.step2Accent': 'Android › media',
  'onboard.step2b': ' en el selector que muestra Android.',
  'onboard.step3':
    'Listo. Desde entonces, el autoguardado puede conservar cada estado nuevo.',
  'onboard.note':
    'Acceso de solo lectura a una carpeta. Revocable en cualquier momento.',
  'onboard.cta': 'Elegir carpeta',
  'onboard.skip': 'Ahora no',
  'onboard.granted': 'Acceso a la carpeta concedido',
  'onboard.failed': 'No se pudo abrir esa carpeta',

  // ── Feed ──────────────────────────────────────────────────────────────────
  'feed.auto': 'Auto',
  'feed.autoA11y': 'El autoguardado está activado. Abrir Herramientas',

  // ── Filter tabs ───────────────────────────────────────────────────────────
  'filter.all': 'Todos',
  'filter.photos': 'Fotos',
  'filter.videos': 'Videos',

  // ── Section eyebrows ──────────────────────────────────────────────────────
  'group.justNow': 'Justo ahora',
  'group.earlierToday': 'Más temprano hoy',
  'group.today': 'Hoy',
  'group.earlierWeek': 'Antes esta semana',

  // ── Tiles ─────────────────────────────────────────────────────────────────
  'tile.new': 'nuevo',
  'tile.saved': 'Guardado',
  'tile.video': 'Video',
  'tile.photo': 'Foto',

  // ── Empty states ──────────────────────────────────────────────────────────
  'empty.feedTitle': 'Aquí no hay estados',
  'empty.feedBody':
    'Primero mira un estado en tu app de mensajería y vuelve aquí: aparecerá solo.',
  'empty.libraryTitle': 'Todavía no hay nada guardado',
  'empty.libraryBody':
    'Toca un estado y luego Guardar. Todo lo que conserves queda aquí y sigue estando cuando pasen las 24 horas.',
  'empty.libraryAccessBody':
    'Los estados guardados están en el almacenamiento del teléfono. Permite el acceso al almacenamiento para verlos aquí. No se sube nada; la app no tiene permiso de internet.',
  'empty.allowAccess': 'Permitir acceso al almacenamiento',
  'empty.openFeed': 'Ir al inicio',
  'empty.noFolderTitle': 'Aún no hay nada que leer',
  'empty.noFolderBody':
    'Indica a la app la carpeta donde tu app de mensajería guarda sus estados y aparecerán aquí solos.',
  'empty.noStorageBody':
    'Los estados se leen del almacenamiento del teléfono. Permite el acceso al almacenamiento y aparecerán aquí solos.',
  'empty.allowStorage': 'Permitir acceso al almacenamiento',
  'empty.favTitle': 'Aún no hay favoritos',
  'empty.favBody': 'Toca el corazón en un estado guardado y aparecerá aquí.',
  'empty.vaultTitle': 'La bóveda está vacía',
  'empty.vaultBody':
    'Mueve aquí un estado guardado para mantenerlo fuera de la galería.',
  'empty.openWhatsApp': 'Abrir la app de mensajería',

  // ── Library ───────────────────────────────────────────────────────────────
  'library.all': 'Todo lo guardado',
  'library.fav': 'Favoritos',
  'library.vault': 'Bóveda',
  'library.meta_one': '{n} archivo · {size}',
  'library.meta_other': '{n} archivos · {size}',

  // ── Selection ─────────────────────────────────────────────────────────────
  'select.title': 'Seleccionar elementos',
  'select.hint': 'Toca para elegir',
  'select.count_one': '{n} seleccionado',
  'select.count_other': '{n} seleccionados',
  'select.all': 'Seleccionar todo',
  'select.clear': 'Borrar',
  'select.save': 'Guardar',
  'select.saveN': 'Guardar {n}',
  'select.delete': 'Eliminar',
  'select.deleteN': 'Eliminar {n}',
  'select.vault': 'Mover a la Bóveda',
  'select.restore': 'Restaurar a la galería',
  'select.share': 'Compartir',

  // ── Sort sheet ────────────────────────────────────────────────────────────
  'sort.new': 'Más recientes primero',
  'sort.old': 'Más antiguos primero',
  'sort.big': 'Archivo más grande',
  'sort.type': 'Agrupar por tipo',

  // ── Tools ─────────────────────────────────────────────────────────────────
  'tools.subtitle': 'automatización y almacenamiento',
  'tools.autoSave': 'Autoguardado',
  'tools.autoTitle': 'Guardar los estados nuevos por mí',
  'tools.autoSub': 'Se ejecuta al abrir la app. Nada sale del dispositivo.',
  'tools.whatToKeep': 'Qué conservar',
  'tools.modeBoth': 'Todo',
  'tools.modePhotos': 'Fotos',
  'tools.modeVideos': 'Videos',
  'tools.autoVault': 'Enviar directo a la Bóveda',
  'tools.whereSaves': 'Dónde se guarda',
  'tools.saveFolder': 'Carpeta de guardado',
  'tools.savePath': 'DCIM / Status',
  'tools.savePathLegacy': 'Pictures y Movies / Status',
  'tools.change': 'Cambiar',
  'tools.storage': 'Almacenamiento',
  'tools.usedTotal': '{size} guardados',
  'tools.storageReading': 'Leyendo el almacenamiento…',
  'tools.filesKept_one': '{n} archivo',
  'tools.filesKept_other': '{n} archivos',
  'tools.photosShare': 'Fotos {size}',
  'tools.videosShare': 'Vídeos {size}',
  'tools.message': 'Escribir a un número',
  'tools.dmBody':
    'Abre un chat con cualquier número sin guardarlo en tus contactos.',
  'tools.dialCode': 'Código de país',
  'tools.phonePlaceholder': 'Número de teléfono',
  'tools.openChat': 'Abrir chat',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Ajustes',
  'settings.aboutCard':
    'Todas las funciones están activas, gratis, para siempre. Sin anuncios, sin cuentas, sin permiso de internet: la app no puede enviar tus datos a ninguna parte.',
  'settings.appearance': 'Apariencia',
  'settings.themeLight': 'Claro',
  'settings.themeDark': 'Oscuro',
  'settings.themeSystem': 'Sistema',
  'settings.privacy': 'Privacidad',
  'settings.hideRecents': 'Ocultar en recientes',
  'settings.hideRecentsSub':
    'Deja en blanco la vista previa de la app al cambiar',
  'settings.statusFolder': 'Carpeta de estados',
  'settings.folderGranted': 'Android/media · concedido',
  'settings.folderMissing': 'Sin elegir todavía · toca para elegir',
  'settings.mediaAccess': 'Acceso al almacenamiento',
  'settings.mediaGranted': 'Permitido · se muestran todos los guardados',
  'settings.mediaMissing': 'No permitido · los guardados quedan ocultos',
  'settings.general': 'General',
  'settings.language': 'Idioma',
  'settings.languagesAvailable': '{n} disponibles',
  'settings.shareApp': 'Compartir la app',
  'settings.rate': 'Valorar la app',
  'settings.feedback': 'Enviar comentarios',
  'toast.noStore': 'Ninguna app puede abrir ese enlace',
  'toast.metaLink': 'link',
  'feedback.subject': 'Comentarios sobre Status Saver',
  'settings.help': 'Ayuda',
  'settings.legal': 'Privacidad y términos',
  'settings.footer': 'Sin permiso de internet · sin rastreadores',
  'settings.madeBy': 'Made with ❤️ by Vaishnav',

  // ── Viewer ────────────────────────────────────────────────────────────────
  'viewer.captured': 'capturado',
  'viewer.size': 'tamaño',
  'viewer.type': 'tipo',
  'viewer.hint':
    'Toca dos veces el contenido para guardar · toca los lados para moverte',
  'viewer.save': 'Guardar',
  'viewer.saved': 'Guardado',
  'viewer.delete': 'Eliminar',
  'viewer.share': 'Compartir',
  'viewer.repost': 'Republicar',
  'viewer.close': 'Cerrar',
  'viewer.zoom': 'Zoom',
  'viewer.favourite': 'Favorito',
  'viewer.play': 'Reproducir',
  'viewer.pause': 'Pausar',
  'viewer.counter': '{n} / {total}',
  'viewer.today': 'Hoy, {time}',
  'viewer.yesterday': 'Ayer, {time}',

  // ── Batch overlay ─────────────────────────────────────────────────────────
  'batch.title': 'Guardando',
  'batch.body':
    'Escribiendo los originales en Galería › Status. Se conserva la calidad completa.',
  'batch.progress': '{done} / {total}',

  // ── Toasts ────────────────────────────────────────────────────────────────
  'toast.saved': 'Guardado en Galería › Status',
  'toast.savedMany': '{n} estados guardados',
  'toast.alreadySaved': 'Ya está en tu biblioteca',
  'toast.metaSkip': 'skip',
  'toast.upToDate': 'Al día · analizado justo ahora',
  'toast.metaScan': 'scan',
  'toast.movedToVault_one': '{n} estado movido a la Bóveda',
  'toast.movedToVault_other': '{n} estados movidos a la Bóveda',
  'toast.restored_one': '{n} estado restaurado',
  'toast.restored_other': '{n} estados restaurados',
  'toast.vaultedStillPublic':
    'Guardado en la Bóveda, pero la copia de la galería sigue ahí',
  'toast.metaPrivate': 'private',
  'toast.shareOpened': 'Menú de compartir abierto',
  'toast.shareOpenedN': 'Menú de compartir abierto · {n} archivos',
  'toast.metaSystem': 'system',
  'toast.removed_one': 'Eliminado de la biblioteca',
  'toast.removed_other': '{n} estados eliminados',
  'toast.metaDeleted': 'deleted',
  'toast.openingWhatsApp': 'Abriendo tu app de mensajería',
  'toast.metaHandoff': 'handoff',
  'toast.favAdded': 'Añadido a Favoritos',
  'toast.favRemoved': 'Quitado de Favoritos',
  'toast.metaLibrary': 'library',
  'toast.reposted': 'Abierto en tu app de mensajería',
  'toast.metaRepost': 'repost',
  'toast.autoOn': 'Autoguardado activado',
  'toast.autoOff': 'Autoguardado desactivado',
  'toast.metaTools': 'tools',
  'toast.chooseFolder': 'Elige una carpeta en Archivos',
  'toast.metaStorage': 'storage',
  'toast.needDigits': 'Escribe al menos 6 dígitos',
  'toast.needDialCode': 'Escribe un código de país',
  'toast.metaCheck': 'check',
  'toast.openingChat': 'Abriendo un chat con {number}',
  'toast.metaChat': 'chat',
  'toast.lightTheme': 'El tema claro se aplica en el dispositivo',
  'toast.metaTheme': 'theme',
  'toast.folderGranted': 'Acceso a la carpeta concedido',
  'toast.metaSetup': 'setup',
  'toast.saveFailed': 'No se pudo guardar ese estado',
  'toast.deleteFailed': 'No se pudo eliminar ese archivo',
  'toast.permissionNeeded':
    'Permite el acceso al almacenamiento para continuar',
  'toast.openSettings': 'Abrir ajustes',
  'toast.whatsappMissing': 'La app de mensajería no está instalada',
  'toast.repostFailed': 'No se pudo enviar a la app de mensajería',
  'toast.autoSaved_one': '{n} estado nuevo guardado automáticamente',
  'toast.autoSaved_other': '{n} estados nuevos guardados automáticamente',

  // ── Confirmations ─────────────────────────────────────────────────────────
  'confirm.deleteTitle_one': '¿Quitar {n} estado?',
  'confirm.deleteTitle_other': '¿Quitar {n} estados?',
  'confirm.deleteBody':
    'Salen de tu biblioteca y de la galería. No se puede deshacer.',
  'confirm.delete': 'Quitar',
  'confirm.cancel': 'Conservar',

  // ── Permission guide ──────────────────────────────────────────────────────
  'guide.title': 'Elegir la carpeta',
  'guide.intro':
    'Android muestra su propio selector de archivos. Dos toques y listo.',
  'guide.step1':
    'En el selector, abre Android › media y toca Usar esta carpeta.',
  'guide.step2':
    'Confirma con Permitir. El acceso es de solo lectura y puedes revocarlo en cualquier momento.',
  'guide.open': 'Abrir el selector',
  'guide.mockInternal': 'Almacenamiento interno',
  'guide.mockUseFolder': 'Usar esta carpeta',
  'guide.mockAllowTitle': '¿Permitir el acceso a media?',
  'guide.mockAllowBody':
    'Esto permite que Status Saver lea los archivos de estado guardados en caché aquí.',
  'guide.mockAllow': 'Permitir',

  // ── Help ──────────────────────────────────────────────────────────────────
  'help.title': 'Ayuda',
  'help.gettingStarted': 'Primeros pasos',
  'help.q1': '¿Por qué no veo ningún estado?',
  'help.a1':
    'Abre tu app de mensajería y mira primero el estado de alguien. Status Saver solo puede leer lo que esa app ya descargó en este teléfono.',
  'help.q2': '¿Dónde van los archivos guardados?',
  'help.a2':
    'A tu galería, en un álbum llamado Status. Lo que marques como privado se queda dentro de Status Saver y nunca llega a la galería.',
  'help.q3': '¿La persona sabe que lo guardé?',
  'help.a3':
    'No. Todo ocurre en tu dispositivo y la app no puede acceder a internet. Ten consideración al volver a compartir lo que otras personas publican.',
  'help.q4': 'Un estado desapareció. ¿Por qué?',
  'help.a4':
    'Los estados en caché se borran después de 24 horas. Guarda antes los que quieras conservar.',
  'help.q5': 'El selector de carpetas rechaza mi elección.',
  'help.a5':
    'Elige la carpeta llamada media dentro de Android, no una carpeta más profunda. Status Saver encuentra por su cuenta la carpeta .Statuses que está debajo.',
  'help.troubleshooting': 'Solución de problemas',
  'help.resetFolder': 'Volver a elegir la carpeta de estados',
  'help.resetFolderBody':
    'Usa esto si los estados dejaron de aparecer después de una actualización de tu app de mensajería.',

  // ── Privacy & terms ───────────────────────────────────────────────────────
  'about.title': 'Privacidad y términos',
  'about.tagline': 'Mira, guarda y comparte estados, totalmente sin conexión.',
  'about.privacyHeading': 'Privacidad',
  'about.privacyBody':
    'Status Saver no tiene el permiso INTERNET, así que no puede enviar nada a ninguna parte. No hay analíticas, ni identificador de publicidad, ni informes de fallos. Nunca pide «Acceso a todos los archivos». Los archivos de estado que lee son los que tu app de mensajería ya guardó en tu dispositivo.',
  'about.dataHeading': 'Qué se guarda',
  'about.dataBody':
    'Tus ajustes, tu idioma, tus favoritos, la lista de estados que guardaste y todo lo que hay en la Bóveda. Todo eso vive en este dispositivo y se elimina cuando desinstalas la app. Las copias guardadas en tu galería se quedan hasta que las borres.',
  'about.termsHeading': 'Términos',
  'about.termsBody':
    'Status Saver se ofrece tal cual, sin garantía. Eres responsable del uso que des al contenido que conservas: respeta la privacidad de quienes lo publicaron y los derechos de autor de todo lo que vuelvas a compartir.',
  'about.disclaimer':
    'Status Saver es una app independiente. No está afiliada, avalada ni conectada con WhatsApp LLC ni Meta Platforms, Inc. WhatsApp y Meta son marcas de sus respectivos propietarios. Esta app no modifica ni interfiere con ninguna app de mensajería: solo lee los archivos de estado ya guardados en este dispositivo.',

  // ── Accessibility labels ──────────────────────────────────────────────────
  'a11y.refresh': 'Actualizar',
  'a11y.sort': 'Ordenar por',
  'a11y.settings': 'Ajustes',
  'a11y.selectMode': 'Seleccionar',
  'a11y.exitSelect': 'Salir de la selección',
  'a11y.tile': '{kind} {time}',
  'a11y.backToFeed': 'Volver al feed',
};
