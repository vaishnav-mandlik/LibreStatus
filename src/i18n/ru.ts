import type { Dictionary } from './en';

// Russian has three plural forms; `_other` is phrased "Noun: {n}" so it reads
// correctly for every count the two-form `tp()` sends it.
export const ru: Dictionary = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  'brand.name': 'Status Saver',

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.feed': 'Лента',
  'nav.library': 'Сохранённые',
  'nav.tools': 'Инструменты',
  'nav.settings': 'Настройки',

  // ── Common ────────────────────────────────────────────────────────────────
  'common.close': 'Закрыть',
  'common.cancel': 'Отмена',
  'common.undo': 'Отменить',
  'common.refresh': 'Обновить',
  'common.sortBy': 'Сортировка',
  'common.select': 'Выбрать',
  'common.retry': 'Повторить',
  'common.ok': 'ОК',

  // ── Error boundary ────────────────────────────────────────────────────────
  'error.title': 'Что-то пошло не так',
  'error.body':
    'В приложении возникла непредвиденная ошибка, и этот экран не удалось отрисовать. Ничего не потеряно, сохранённые статусы остались на устройстве.',

  // ── Onboarding ────────────────────────────────────────────────────────────
  // The three first-run intro slides, shown once after install.
  'intro.one.title': 'Все статусы в одной сетке.',
  'intro.one.body':
    'Фото и видео, которые ваш мессенджер уже сохранил в кэше этого телефона, собраны в одном месте.',
  'intro.two.title': 'Сохраните то, что нужно.',
  'intro.two.body':
    'Статус исчезает через 24 часа. Сохраните его — копия останется в галерее, в папке Status.',
  'intro.three.title': 'Ничего не покидает телефон.',
  'intro.three.body':
    'Ни аккаунта, ни рекламы, ни слежки. У приложения вовсе нет доступа в интернет, так что выгрузить ничего нельзя.',
  'intro.next': 'Далее',
  'intro.start': 'Начать',
  'intro.skip': 'Пропустить',
  'intro.progress': 'Экран {n} из {total}',
  'onboard.title': 'Укажите папку, которой уже пользуется ваш мессенджер.',
  'onboard.body':
    'Мы читаем файлы статусов из кеша на этом телефоне. Ничего не загружается в сеть: у приложения вообще нет разрешения на интернет.',
  'onboard.step1':
    'Откройте мессенджер и посмотрите статус, который хотите сохранить.',
  'onboard.step2a': 'Вернитесь сюда и выберите ',
  'onboard.step2Accent': 'Android › media',
  'onboard.step2b': ' в окне выбора, которое покажет Android.',
  'onboard.step3':
    'Готово. Дальше автосохранение может сохранять каждый новый статус.',
  'onboard.note':
    'Доступ только для чтения к одной папке. Можно отозвать в любой момент.',
  'onboard.cta': 'Выбрать папку',
  'onboard.skip': 'Не сейчас',
  'onboard.granted': 'Доступ к папке получен',
  'onboard.failed': 'Не удалось открыть эту папку',

  // ── Feed ──────────────────────────────────────────────────────────────────
  'feed.auto': 'Авто',
  'feed.autoA11y': 'Автосохранение включено. Открыть Инструменты',

  // ── Filter tabs ───────────────────────────────────────────────────────────
  'filter.all': 'Все',
  'filter.photos': 'Фото',
  'filter.videos': 'Видео',

  // ── Section eyebrows ──────────────────────────────────────────────────────
  'group.justNow': 'Только что',
  'group.earlierToday': 'Ранее сегодня',
  'group.today': 'Сегодня',
  'group.earlierWeek': 'Ранее на этой неделе',

  // ── Tiles ─────────────────────────────────────────────────────────────────
  'tile.new': 'новое',
  'tile.saved': 'Сохранено',
  'tile.video': 'Видео',
  'tile.photo': 'Фото',

  // ── Empty states ──────────────────────────────────────────────────────────
  'empty.feedTitle': 'Здесь пока нет статусов',
  'empty.feedBody':
    'Сначала посмотрите статус в мессенджере, затем вернитесь: он появится сам.',
  'empty.libraryTitle': 'Пока ничего не сохранено',
  'empty.libraryBody':
    'Нажмите на статус, затем «Сохранить». Всё, что вы сохраняете, попадает сюда и остаётся после истечения 24 часов.',
  'empty.libraryAccessBody':
    'Сохранённые статусы лежат в памяти телефона. Разрешите доступ к памяти, чтобы увидеть их здесь. Ничего не выгружается; у приложения нет доступа в интернет.',
  'empty.allowAccess': 'Разрешить доступ к памяти',
  'empty.openFeed': 'Перейти к ленте',
  'empty.noFolderTitle': 'Пока нечего читать',
  'empty.noFolderBody':
    'Укажите приложению папку, где мессенджер хранит статусы, и они появятся здесь сами.',
  'empty.noStorageBody':
    'Статусы читаются из памяти телефона. Разрешите доступ к памяти, и они появятся здесь сами.',
  'empty.allowStorage': 'Разрешить доступ к хранилищу',
  'empty.favTitle': 'Избранного пока нет',
  'empty.favBody':
    'Нажмите сердечко на сохранённом статусе, и он появится здесь.',
  'empty.vaultTitle': 'Сейф пуст',
  'empty.vaultBody':
    'Переместите сюда сохранённый статус, чтобы он не попадал в галерею.',
  'empty.openWhatsApp': 'Открыть мессенджер',

  // ── Library ───────────────────────────────────────────────────────────────
  'library.all': 'Все сохранённые',
  'library.fav': 'Избранное',
  'library.vault': 'Сейф',
  'library.meta_one': '{n} файл · {size}',
  'library.meta_other': 'Файлов: {n} · {size}',

  // ── Selection ─────────────────────────────────────────────────────────────
  'select.title': 'Выберите элементы',
  'select.hint': 'Нажмите, чтобы выбрать',
  'select.count_one': 'Выбран {n}',
  'select.count_other': 'Выбрано: {n}',
  'select.all': 'Выбрать все',
  'select.clear': 'Снять выбор',
  'select.save': 'Сохранить',
  'select.saveN': 'Сохранить ({n})',
  'select.delete': 'Удалить',
  'select.deleteN': 'Удалить ({n})',
  'select.vault': 'В Сейф',
  'select.restore': 'Вернуть в галерею',
  'select.share': 'Поделиться',

  // ── Sort sheet ────────────────────────────────────────────────────────────
  'sort.new': 'Сначала новые',
  'sort.old': 'Сначала старые',
  'sort.big': 'Самые большие файлы',
  'sort.type': 'По типу',

  // ── Tools ─────────────────────────────────────────────────────────────────
  'tools.subtitle': 'автоматизация и хранилище',
  'tools.autoSave': 'Автосохранение',
  'tools.autoTitle': 'Сохранять новые статусы за меня',
  'tools.autoSub':
    'Работает при открытии приложения. Ничего не покидает устройство.',
  'tools.whatToKeep': 'Что сохранять',
  'tools.modeBoth': 'Всё',
  'tools.modePhotos': 'Фото',
  'tools.modeVideos': 'Видео',
  'tools.autoVault': 'Сразу в Сейф',
  'tools.whereSaves': 'Куда сохранять',
  'tools.saveFolder': 'Папка сохранения',
  'tools.savePath': 'DCIM / Status',
  'tools.savePathLegacy': 'Pictures и Movies / Status',
  'tools.change': 'Изменить',
  'tools.storage': 'Хранилище',
  'tools.usedTotal': 'Сохранено: {size}',
  'tools.storageReading': 'Читаем память…',
  'tools.filesKept_one': '{n} файл',
  'tools.filesKept_other': 'Файлов: {n}',
  'tools.photosShare': 'Фото {size}',
  'tools.videosShare': 'Видео {size}',
  'tools.message': 'Написать на номер',
  'tools.dmBody': 'Откройте чат с любым номером, не сохраняя его в контактах.',
  'tools.dialCode': 'Код страны',
  'tools.phonePlaceholder': 'Номер телефона',
  'tools.openChat': 'Открыть чат',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Настройки',
  'settings.aboutCard':
    'Все функции включены, бесплатно и навсегда. Без рекламы, без аккаунтов, без разрешения на интернет: приложение не может никуда отправить ваши данные.',
  'settings.appearance': 'Оформление',
  'settings.themeLight': 'Светлая',
  'settings.themeDark': 'Тёмная',
  'settings.themeSystem': 'Системная',
  'settings.privacy': 'Конфиденциальность',
  'settings.hideRecents': 'Скрывать в недавних',
  'settings.hideRecentsSub': 'Пустой экран предпросмотра при переключении',
  'settings.statusFolder': 'Папка статусов',
  'settings.folderGranted': 'Android/media · доступ есть',
  'settings.folderMissing': 'Ещё не выбрана · нажмите, чтобы выбрать',
  'settings.mediaAccess': 'Доступ к памяти',
  'settings.mediaGranted': 'Разрешено · показаны все сохранённые статусы',
  'settings.mediaMissing': 'Не разрешено · сохранённые статусы скрыты',
  'settings.general': 'Общие',
  'settings.language': 'Язык',
  'settings.languagesAvailable': 'Доступно: {n}',
  'settings.shareApp': 'Поделиться приложением',
  'settings.rate': 'Оценить приложение',
  'settings.feedback': 'Отправить отзыв',
  'toast.noStore': 'Ни одно приложение не откроет эту ссылку',
  'toast.metaLink': 'link',
  'feedback.subject': 'Отзыв о Status Saver',
  'settings.help': 'Справка',
  'settings.legal': 'Конфиденциальность и условия',
  'settings.footer': 'Без разрешения на интернет · без трекеров',
  'settings.madeBy': 'Made with ❤️ by Vaishnav',

  // ── Viewer ────────────────────────────────────────────────────────────────
  'viewer.captured': 'снято',
  'viewer.size': 'размер',
  'viewer.type': 'тип',
  'viewer.hint': 'Двойное нажатие, сохранить · нажатие по краям, листать',
  'viewer.save': 'Сохранить',
  'viewer.saved': 'Сохранено',
  'viewer.delete': 'Удалить',
  'viewer.share': 'Поделиться',
  'viewer.repost': 'Репост',
  'viewer.close': 'Закрыть',
  'viewer.zoom': 'Масштаб',
  'viewer.favourite': 'В избранное',
  'viewer.play': 'Воспроизвести',
  'viewer.pause': 'Пауза',
  'viewer.counter': '{n} / {total}',
  'viewer.today': 'Сегодня, {time}',
  'viewer.yesterday': 'Вчера, {time}',

  // ── Batch overlay ─────────────────────────────────────────────────────────
  'batch.title': 'Сохранение',
  'batch.body':
    'Записываем оригиналы в Галерея › Status. Качество сохраняется полностью.',
  'batch.progress': '{done} / {total}',

  // ── Toasts ────────────────────────────────────────────────────────────────
  'toast.saved': 'Сохранено в Галерея › Status',
  'toast.savedMany': 'Сохранено статусов: {n}',
  'toast.alreadySaved': 'Уже в вашей библиотеке',
  'toast.metaSkip': 'skip',
  'toast.upToDate': 'Всё актуально · проверено только что',
  'toast.metaScan': 'scan',
  'toast.movedToVault_one': '{n} статус перемещён в Сейф',
  'toast.movedToVault_other': 'Перемещено в Сейф: {n}',
  'toast.restored_one': '{n} статус восстановлен',
  'toast.restored_other': 'Восстановлено статусов: {n}',
  'toast.vaultedStillPublic': 'Сохранено в Сейфе, но копия в галерее осталась',
  'toast.metaPrivate': 'private',
  'toast.shareOpened': 'Открыто меню «Поделиться»',
  'toast.shareOpenedN': 'Открыто меню «Поделиться» · файлов: {n}',
  'toast.metaSystem': 'system',
  'toast.removed_one': 'Удалено из библиотеки',
  'toast.removed_other': 'Удалено статусов: {n}',
  'toast.metaDeleted': 'deleted',
  'toast.openingWhatsApp': 'Открываем мессенджер',
  'toast.metaHandoff': 'handoff',
  'toast.favAdded': 'Добавлено в Избранное',
  'toast.favRemoved': 'Удалено из Избранного',
  'toast.metaLibrary': 'library',
  'toast.reposted': 'Открыто в мессенджере',
  'toast.metaRepost': 'repost',
  'toast.autoOn': 'Автосохранение включено',
  'toast.autoOff': 'Автосохранение выключено',
  'toast.metaTools': 'tools',
  'toast.chooseFolder': 'Выберите папку в приложении «Файлы»',
  'toast.metaStorage': 'storage',
  'toast.needDigits': 'Введите не менее 6 цифр',
  'toast.needDialCode': 'Введите код страны',
  'toast.metaCheck': 'check',
  'toast.openingChat': 'Открываем чат с {number}',
  'toast.metaChat': 'chat',
  'toast.lightTheme': 'Светлая тема применяется на устройстве',
  'toast.metaTheme': 'theme',
  'toast.folderGranted': 'Доступ к папке получен',
  'toast.metaSetup': 'setup',
  'toast.saveFailed': 'Не удалось сохранить этот статус',
  'toast.deleteFailed': 'Не удалось удалить этот файл',
  'toast.permissionNeeded': 'Разрешите доступ к памяти, чтобы продолжить',
  'toast.openSettings': 'Открыть настройки',
  'toast.whatsappMissing': 'Мессенджер не установлен',
  'toast.repostFailed': 'Не удалось передать в мессенджер',
  'toast.autoSaved_one': '{n} новый статус сохранён автоматически',
  'toast.autoSaved_other': 'Автоматически сохранено новых статусов: {n}',

  // ── Confirmations ─────────────────────────────────────────────────────────
  'confirm.deleteTitle_one': 'Удалить {n} статус?',
  'confirm.deleteTitle_other': 'Удалить выбранные статусы ({n})?',
  'confirm.deleteBody':
    'Они исчезнут из библиотеки и галереи. Отменить это нельзя.',
  'confirm.delete': 'Удалить',
  'confirm.cancel': 'Оставить',

  // ── Permission guide ──────────────────────────────────────────────────────
  'guide.title': 'Выбор папки',
  'guide.intro':
    'Android покажет собственное окно выбора файлов. Два нажатия, и готово.',
  'guide.step1':
    'В окне выбора откройте Android › media и нажмите «Использовать эту папку».',
  'guide.step2':
    'Подтвердите кнопкой «Разрешить». Доступ только для чтения, отозвать его можно в любой момент.',
  'guide.open': 'Открыть окно выбора',
  'guide.mockInternal': 'Внутренняя память',
  'guide.mockUseFolder': 'Использовать эту папку',
  'guide.mockAllowTitle': 'Разрешить доступ к media?',
  'guide.mockAllowBody':
    'Это позволит Status Saver читать файлы статусов из кеша в этой папке.',
  'guide.mockAllow': 'Разрешить',

  // ── Help ──────────────────────────────────────────────────────────────────
  'help.title': 'Справка',
  'help.gettingStarted': 'Начало работы',
  'help.q1': 'Почему я не вижу ни одного статуса?',
  'help.a1':
    'Сначала откройте мессенджер и посмотрите чей-нибудь статус. Status Saver может читать только то, что мессенджер уже загрузил на этот телефон.',
  'help.q2': 'Куда попадают сохранённые файлы?',
  'help.a2':
    'В галерею, в альбом с названием Status. Всё, что вы отметите как приватное, остаётся внутри Status Saver и в галерею не попадает.',
  'help.q3': 'Узнает ли человек, что я сохранил его статус?',
  'help.a3':
    'Нет. Всё происходит на вашем устройстве, а доступа в интернет у приложения нет. Относитесь бережно к тому, что публикуют другие, если делитесь этим дальше.',
  'help.q4': 'Статус пропал. Почему?',
  'help.a4':
    'Статусы удаляются из кеша через 24 часа. Сохраняйте нужные до этого момента.',
  'help.q5': 'Выбор папки каждый раз отклоняется.',
  'help.a5':
    'Выберите папку media внутри Android, а не папку глубже. Папку .Statuses под ней Status Saver найдёт сам.',
  'help.troubleshooting': 'Устранение неполадок',
  'help.resetFolder': 'Выбрать папку со статусами заново',
  'help.resetFolderBody':
    'Используйте это, если статусы перестали появляться после обновления мессенджера.',

  // ── Privacy & terms ───────────────────────────────────────────────────────
  'about.title': 'Конфиденциальность и условия',
  'about.tagline':
    'Просмотр, сохранение и отправка статусов, полностью офлайн.',
  'about.privacyHeading': 'Конфиденциальность',
  'about.privacyBody':
    'У Status Saver нет разрешения INTERNET, поэтому приложение не может ничего никуда отправить. Здесь нет аналитики, рекламного идентификатора и отчётов о сбоях. Оно никогда не запрашивает «Доступ ко всем файлам». Файлы статусов, которые оно читает, уже сохранены вашим мессенджером на этом устройстве.',
  'about.dataHeading': 'Что хранится',
  'about.dataBody':
    'Ваши настройки, язык, избранное, список сохранённых статусов и всё, что лежит в Сейфе. Всё это находится на этом устройстве и удаляется при удалении приложения. Копии, сохранённые в галерею, остаются, пока вы их не удалите.',
  'about.termsHeading': 'Условия',
  'about.termsBody':
    'Status Saver предоставляется «как есть», без каких-либо гарантий. Вы сами отвечаете за то, как используете сохранённые медиафайлы: уважайте частную жизнь тех, кто их опубликовал, и авторские права на всё, чем делитесь дальше.',
  'about.disclaimer':
    'Status Saver, независимое приложение. Оно не связано с WhatsApp LLC или Meta Platforms, Inc., не одобрено и не поддерживается ими. WhatsApp и Meta, товарные знаки соответствующих владельцев. Это приложение не изменяет мессенджеры и читает только файлы статусов, уже сохранённые на этом устройстве.',

  // ── Accessibility labels ──────────────────────────────────────────────────
  'a11y.refresh': 'Обновить',
  'a11y.sort': 'Сортировка',
  'a11y.settings': 'Настройки',
  'a11y.selectMode': 'Выбрать',
  'a11y.exitSelect': 'Выйти из режима выбора',
  'a11y.tile': '{kind} {time}',
  'a11y.backToFeed': 'Назад к ленте',
};
