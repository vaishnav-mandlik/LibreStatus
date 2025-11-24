import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

export type LanguageCode =
  | 'en'
  | 'es'
  | 'pt'
  | 'ru'
  | 'fr'
  | 'de'
  | 'it'
  | 'nl';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
];

const STORAGE_KEY = 'app_language';

/**
 * Maps locale codes to supported language codes
 * Detects device language and returns appropriate app language
 */
const getDeviceLanguage = (): LanguageCode => {
  try {
    let deviceLocale = 'en';

    if (Platform.OS === 'ios') {
      deviceLocale =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'en';
    } else if (Platform.OS === 'android') {
      deviceLocale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }

    // Extract language code (e.g., 'en_US' -> 'en', 'pt_BR' -> 'pt')
    const languageCode = deviceLocale.split(/[-_]/)[0].toLowerCase();

    // Map to supported languages
    // Spanish: Spain, Mexico, Argentina, Colombia, etc.
    if (languageCode === 'es') return 'es';

    // Portuguese: Brazil, Portugal
    if (languageCode === 'pt') return 'pt';

    // Russian: Russia, Belarus, Kazakhstan, etc.
    if (languageCode === 'ru') return 'ru';

    // French: France, Belgium, Canada, Switzerland, etc.
    if (languageCode === 'fr') return 'fr';

    // German: Germany, Austria, Switzerland, etc.
    if (languageCode === 'de') return 'de';

    // Italian: Italy, Switzerland
    if (languageCode === 'it') return 'it';

    // Dutch: Netherlands, Belgium
    if (languageCode === 'nl') return 'nl';

    // Default to English for all other languages
    return 'en';
  } catch (error) {
    console.log('Error detecting device language, defaulting to English');
    return 'en';
  }
};

type TranslationKey =
  | 'settings.title'
  | 'settings.appearance'
  | 'settings.themeTitle'
  | 'settings.themeFollowSystem'
  | 'settings.themeDark'
  | 'settings.themeLight'
  | 'settings.themeSystemShort'
  | 'settings.themeDarkShort'
  | 'settings.themeLightShort'
  | 'settings.languageTitle'
  | 'settings.languageDescription'
  | 'settings.languageSelectLabel'
  | 'settings.directMessageTitle'
  | 'settings.directMessageCardTitle'
  | 'settings.directMessageCardSubtitle'
  | 'settings.directMessageCountryPlaceholder'
  | 'settings.directMessageNumberPlaceholder'
  | 'settings.directMessageMessagePlaceholder'
  | 'settings.directMessageButton'
  | 'settings.directMessageAlertTitle'
  | 'settings.directMessageAlertMessage'
  | 'settings.directMessageWhatsappError'
  | 'settings.aboutTitle'
  | 'settings.aboutShare'
  | 'settings.aboutHelp'
  | 'settings.shareAppAlertTitle'
  | 'settings.shareAppAlertMessage'
  | 'settings.versionLabel'
  | 'settings.languageModalTitle'
  | 'settings.accessibility.close'
  | 'settings.accessibility.changeTheme'
  | 'general.unavailableTitle'
  | 'general.unavailableMessage'
  | 'tabs.images'
  | 'tabs.videos'
  | 'tabs.status'
  | 'tabs.saved'
  | 'tabs.settings'
  | 'tabs.imagesAccessibility'
  | 'tabs.videosAccessibility'
  | 'tabs.statusAccessibility'
  | 'tabs.savedAccessibility'
  | 'tabs.settingsAccessibility'
  | 'status.errorLoadTitle'
  | 'status.errorLoadMessage'
  | 'status.savedTitle'
  | 'status.savedMessage'
  | 'status.errorSaveTitle'
  | 'status.errorSaveMessage'
  | 'status.errorPermissionTitle'
  | 'status.errorPermissionMessage'
  | 'status.emptyImages'
  | 'status.emptyVideos'
  | 'status.emptyImagesSubtitle'
  | 'status.emptyVideosSubtitle'
  | 'status.emptySavedImages'
  | 'status.emptySavedVideos'
  | 'viewer.shareMessage'
  | 'viewer.shareTitle'
  | 'viewer.shareFailedTitle'
  | 'viewer.shareFailedMessage'
  | 'viewer.whatsappNotInstalledTitle'
  | 'viewer.whatsappNotInstalledMessage'
  | 'viewer.repostMessage'
  | 'viewer.repostTitle'
  | 'viewer.repostFailedMessage';

type TranslationDictionary = Record<TranslationKey, string>;

const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  en: {
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.themeTitle': 'Theme',
    'settings.themeFollowSystem': 'Follow system theme',
    'settings.themeDark': 'Dark mode',
    'settings.themeLight': 'Light mode',
    'settings.themeSystemShort': 'System',
    'settings.themeDarkShort': 'Dark',
    'settings.themeLightShort': 'Light',
    'settings.languageTitle': 'App language',
    'settings.languageDescription': 'Pick the language for the app.',
    'settings.languageSelectLabel': 'Selected language',
    'settings.directMessageTitle': 'Direct Message',
    'settings.directMessageCardTitle': 'Chat without saving contact',
    'settings.directMessageCardSubtitle': 'Send a message instantly.',
    'settings.directMessageCountryPlaceholder': '+1',
    'settings.directMessageNumberPlaceholder': '0123456789',
    'settings.directMessageMessagePlaceholder': 'Optional message...',
    'settings.directMessageButton': 'Send',
    'settings.directMessageAlertTitle': 'Phone number required',
    'settings.directMessageAlertMessage':
      'Please enter a valid country code and phone number.',
    'settings.directMessageWhatsappError':
      'Please check if the app is installed.',
    'settings.aboutTitle': 'About',
    'settings.aboutShare': 'Share app',
    'settings.aboutHelp': 'Help',
    'settings.shareAppAlertTitle': 'Share app',
    'settings.shareAppAlertMessage': 'Check out this amazing Status Saver app!',
    'settings.versionLabel': 'Version 1.0.0',
    'settings.languageModalTitle': 'Choose a language',
    'settings.accessibility.close': 'Close settings',
    'settings.accessibility.changeTheme': 'Change theme',
    'general.unavailableTitle': 'Unavailable',
    'general.unavailableMessage': 'Unable to open the requested link.',
    'tabs.images': 'IMAGES',
    'tabs.videos': 'VIDEOS',
    'tabs.status': 'Status',
    'tabs.saved': 'Saved',
    'tabs.settings': 'Settings',
    'tabs.imagesAccessibility': 'Switch to images tab',
    'tabs.videosAccessibility': 'Switch to videos tab',
    'tabs.statusAccessibility': 'Show recent statuses',
    'tabs.savedAccessibility': 'Show saved items',
    'tabs.settingsAccessibility': 'Open settings',
    'status.errorLoadTitle': 'Failed to load statuses',
    'status.errorLoadMessage': 'Please try again in a moment.',
    'status.savedTitle': 'Saved to gallery',
    'status.savedMessage': 'Status is now available in your downloads.',
    'status.errorSaveTitle': 'Failed to save',
    'status.errorSaveMessage': 'Please try again after a moment.',
    'status.errorPermissionTitle': 'Something went wrong',
    'status.errorPermissionMessage':
      'Unable to open folder picker. Please try again.',
    'status.emptyImages': 'No images found',
    'status.emptyVideos': 'No videos found',
    'status.emptyImagesSubtitle':
      "Pull down to refresh or view someone's status",
    'status.emptyVideosSubtitle':
      "Pull down to refresh or view someone's status",
    'status.emptySavedImages': 'No saved images yet',
    'status.emptySavedVideos': 'No saved videos yet',
    'viewer.shareMessage': 'Check out this status!',
    'viewer.shareTitle': 'Share Status',
    'viewer.shareFailedTitle': 'Share failed',
    'viewer.shareFailedMessage':
      'We could not share this status. Try again shortly.',
    'viewer.whatsappNotInstalledTitle': 'App not installed',
    'viewer.whatsappNotInstalledMessage':
      'Install the app to repost this status.',
    'viewer.repostMessage': 'Sharing this status — tap My Status to repost.',
    'viewer.repostTitle': 'Share Status',
    'viewer.repostFailedMessage': 'Could not share. Try again shortly.',
  },
  es: {
    'settings.title': 'Configuración',
    'settings.appearance': 'Apariencia',
    'settings.themeTitle': 'Tema',
    'settings.themeFollowSystem': 'Seguir tema del sistema',
    'settings.themeDark': 'Modo oscuro',
    'settings.themeLight': 'Modo claro',
    'settings.themeSystemShort': 'Sistema',
    'settings.themeDarkShort': 'Oscuro',
    'settings.themeLightShort': 'Claro',
    'settings.languageTitle': 'Idioma de la aplicación',
    'settings.languageDescription': 'Elige el idioma de la app.',
    'settings.languageSelectLabel': 'Idioma seleccionado',
    'settings.directMessageTitle': 'Mensaje directo',
    'settings.directMessageCardTitle': 'Chatear sin guardar contacto',
    'settings.directMessageCardSubtitle': 'Envía un mensaje al instante.',
    'settings.directMessageCountryPlaceholder': '+34',
    'settings.directMessageNumberPlaceholder': '612345678',
    'settings.directMessageMessagePlaceholder': 'Mensaje opcional...',
    'settings.directMessageButton': 'Enviar',
    'settings.directMessageAlertTitle': 'Número requerido',
    'settings.directMessageAlertMessage':
      'Introduce un prefijo y número válidos.',
    'settings.directMessageWhatsappError':
      'Comprueba si la app está instalada.',
    'settings.aboutTitle': 'Acerca de',
    'settings.aboutShare': 'Compartir app',
    'settings.aboutHelp': 'Ayuda',
    'settings.shareAppAlertTitle': 'Compartir app',
    'settings.shareAppAlertMessage':
      '¡Mira esta increíble app para guardar estados!',
    'settings.versionLabel': 'Versión 1.0.0',
    'settings.languageModalTitle': 'Selecciona un idioma',
    'settings.accessibility.close': 'Cerrar ajustes',
    'settings.accessibility.changeTheme': 'Cambiar tema',
    'general.unavailableTitle': 'No disponible',
    'general.unavailableMessage': 'No se puede abrir el enlace solicitado.',
    'tabs.images': 'IMÁGENES',
    'tabs.videos': 'VÍDEOS',
    'tabs.status': 'Estado',
    'tabs.saved': 'Guardado',
    'tabs.settings': 'Ajustes',
    'tabs.imagesAccessibility': 'Cambiar a pestaña de imágenes',
    'tabs.videosAccessibility': 'Cambiar a pestaña de videos',
    'tabs.statusAccessibility': 'Mostrar estados recientes',
    'tabs.savedAccessibility': 'Mostrar elementos guardados',
    'tabs.settingsAccessibility': 'Abrir ajustes',
    'status.errorLoadTitle': 'Error al cargar estados',
    'status.errorLoadMessage': 'Inténtalo de nuevo en un momento.',
    'status.savedTitle': 'Guardado en galería',
    'status.savedMessage': 'El estado está ahora en tus descargas.',
    'status.errorSaveTitle': 'Error al guardar',
    'status.errorSaveMessage': 'Inténtalo de nuevo más tarde.',
    'status.errorPermissionTitle': 'Algo salió mal',
    'status.errorPermissionMessage':
      'No se pudo abrir el selector de carpetas. Inténtalo de nuevo.',
    'status.emptyImages': 'No hay imágenes',
    'status.emptyVideos': 'No hay vídeos',
    'status.emptyImagesSubtitle':
      'Desliza hacia abajo para actualizar o ve el estado de alguien',
    'status.emptyVideosSubtitle':
      'Desliza hacia abajo para actualizar o ve el estado de alguien',
    'status.emptySavedImages': 'No hay imágenes guardadas aún',
    'status.emptySavedVideos': 'No hay vídeos guardados aún',
    'viewer.shareMessage': '¡Mira este estado!',
    'viewer.shareTitle': 'Compartir estado',
    'viewer.shareFailedTitle': 'Error al compartir',
    'viewer.shareFailedMessage':
      'No se pudo compartir este estado. Inténtalo de nuevo.',
    'viewer.whatsappNotInstalledTitle': 'App no instalada',
    'viewer.whatsappNotInstalledMessage':
      'Instala la app para repostear este estado.',
    'viewer.repostMessage':
      'Compartiendo este estado — toca Mi Estado para repostear.',
    'viewer.repostTitle': 'Compartir Estado',
    'viewer.repostFailedMessage': 'No se pudo compartir. Inténtalo de nuevo.',
  },
  pt: {
    'settings.title': 'Configurações',
    'settings.appearance': 'Aparência',
    'settings.themeTitle': 'Tema',
    'settings.themeFollowSystem': 'Seguir tema do sistema',
    'settings.themeDark': 'Modo escuro',
    'settings.themeLight': 'Modo claro',
    'settings.themeSystemShort': 'Sistema',
    'settings.themeDarkShort': 'Escuro',
    'settings.themeLightShort': 'Claro',
    'settings.languageTitle': 'Idioma do app',
    'settings.languageDescription': 'Escolha o idioma do app.',
    'settings.languageSelectLabel': 'Idioma selecionado',
    'settings.directMessageTitle': 'Mensagem direta',
    'settings.directMessageCardTitle': 'Conversar sem salvar contato',
    'settings.directMessageCardSubtitle': 'Envie no ato.',
    'settings.directMessageCountryPlaceholder': '+55',
    'settings.directMessageNumberPlaceholder': '11987654321',
    'settings.directMessageMessagePlaceholder': 'Mensagem opcional...',
    'settings.directMessageButton': 'Enviar',
    'settings.directMessageAlertTitle': 'Número obrigatório',
    'settings.directMessageAlertMessage':
      'Informe um código de país e número válidos.',
    'settings.directMessageWhatsappError': 'Verifique se o app está instalado.',
    'settings.aboutTitle': 'Sobre',
    'settings.aboutShare': 'Compartilhar app',
    'settings.aboutHelp': 'Ajuda',
    'settings.shareAppAlertTitle': 'Compartilhar app',
    'settings.shareAppAlertMessage':
      'Confira este incrível app para salvar status!',
    'settings.versionLabel': 'Versão 1.0.0',
    'settings.languageModalTitle': 'Escolha um idioma',
    'settings.accessibility.close': 'Fechar configurações',
    'settings.accessibility.changeTheme': 'Alterar tema',
    'general.unavailableTitle': 'Indisponível',
    'general.unavailableMessage': 'Não foi possível abrir o link solicitado.',
    'tabs.images': 'IMAGENS',
    'tabs.videos': 'VÍDEOS',
    'tabs.status': 'Status',
    'tabs.saved': 'Salvos',
    'tabs.settings': 'Configurações',
    'tabs.imagesAccessibility': 'Ir para aba de imagens',
    'tabs.videosAccessibility': 'Ir para aba de vídeos',
    'tabs.statusAccessibility': 'Mostrar status recentes',
    'tabs.savedAccessibility': 'Mostrar itens salvos',
    'tabs.settingsAccessibility': 'Abrir configurações',
    'status.errorLoadTitle': 'Falha ao carregar status',
    'status.errorLoadMessage': 'Tente novamente em breve.',
    'status.savedTitle': 'Salvo na galeria',
    'status.savedMessage': 'Status disponível em seus downloads.',
    'status.errorSaveTitle': 'Falha ao salvar',
    'status.errorSaveMessage': 'Tente novamente mais tarde.',
    'status.errorPermissionTitle': 'Algo deu errado',
    'status.errorPermissionMessage':
      'Não foi possível abrir o seletor de pasta. Tente novamente.',
    'status.emptyImages': 'Nenhuma imagem encontrada',
    'status.emptyVideos': 'Nenhum vídeo encontrado',
    'status.emptyImagesSubtitle':
      'Puxe para atualizar ou veja o status de alguém',
    'status.emptyVideosSubtitle':
      'Puxe para atualizar ou veja o status de alguém',
    'status.emptySavedImages': 'Nenhuma imagem salva ainda',
    'status.emptySavedVideos': 'Nenhum vídeo salvo ainda',
    'viewer.shareMessage': 'Confira este status!',
    'viewer.shareTitle': 'Compartilhar status',
    'viewer.shareFailedTitle': 'Falha ao compartilhar',
    'viewer.shareFailedMessage':
      'Não foi possível compartilhar este status. Tente novamente.',
    'viewer.whatsappNotInstalledTitle': 'App não instalado',
    'viewer.whatsappNotInstalledMessage':
      'Instale o app para repostar este status.',
    'viewer.repostMessage':
      'Compartilhando este status — toque em Meu Status para repostar.',
    'viewer.repostTitle': 'Compartilhar Status',
    'viewer.repostFailedMessage':
      'Não foi possível compartilhar. Tente novamente.',
  },
  ru: {
    'settings.title': 'Настройки',
    'settings.appearance': 'Оформление',
    'settings.themeTitle': 'Тема',
    'settings.themeFollowSystem': 'Следовать системной теме',
    'settings.themeDark': 'Тёмная тема',
    'settings.themeLight': 'Светлая тема',
    'settings.themeSystemShort': 'Система',
    'settings.themeDarkShort': 'Тёмная',
    'settings.themeLightShort': 'Светлая',
    'settings.languageTitle': 'Язык приложения',
    'settings.languageDescription': 'Выберите язык приложения.',
    'settings.languageSelectLabel': 'Выбранный язык',
    'settings.directMessageTitle': 'Прямое сообщение',
    'settings.directMessageCardTitle': 'Чат без сохранения контакта',
    'settings.directMessageCardSubtitle': 'Отправляйте мгновенно.',
    'settings.directMessageCountryPlaceholder': '+7',
    'settings.directMessageNumberPlaceholder': '9123456789',
    'settings.directMessageMessagePlaceholder': 'Необязательное сообщение...',
    'settings.directMessageButton': 'Отправить',
    'settings.directMessageAlertTitle': 'Нужен номер телефона',
    'settings.directMessageAlertMessage':
      'Введите корректный код страны и номер телефона.',
    'settings.directMessageWhatsappError':
      'Проверьте, установлено ли приложение.',
    'settings.aboutTitle': 'О приложении',
    'settings.aboutShare': 'Поделиться приложением',
    'settings.aboutHelp': 'Помощь',
    'settings.shareAppAlertTitle': 'Поделиться приложением',
    'settings.shareAppAlertMessage':
      'Посмотрите это удивительное приложение для сохранения статусов!',
    'settings.versionLabel': 'Версия 1.0.0',
    'settings.languageModalTitle': 'Выберите язык',
    'settings.accessibility.close': 'Закрыть настройки',
    'settings.accessibility.changeTheme': 'Сменить тему',
    'general.unavailableTitle': 'Недоступно',
    'general.unavailableMessage': 'Не удалось открыть запрошенную ссылку.',
    'tabs.images': 'ИЗОБРАЖЕНИЯ',
    'tabs.videos': 'ВИДЕО',
    'tabs.status': 'Статусы',
    'tabs.saved': 'Сохранено',
    'tabs.settings': 'Настройки',
    'tabs.imagesAccessibility': 'Перейти на вкладку изображений',
    'tabs.videosAccessibility': 'Перейти на вкладку видео',
    'tabs.statusAccessibility': 'Показать недавние статусы',
    'tabs.savedAccessibility': 'Показать сохранённые элементы',
    'tabs.settingsAccessibility': 'Открыть настройки',
    'status.errorLoadTitle': 'Не удалось загрузить статусы',
    'status.errorLoadMessage': 'Попробуйте снова через некоторое время.',
    'status.savedTitle': 'Сохранено в галерею',
    'status.savedMessage': 'Статус теперь доступен в загрузках.',
    'status.errorSaveTitle': 'Не удалось сохранить',
    'status.errorSaveMessage': 'Попробуйте снова позже.',
    'status.errorPermissionTitle': 'Что-то пошло не так',
    'status.errorPermissionMessage':
      'Не удалось открыть выбор папки. Попробуйте снова.',
    'status.emptyImages': 'Изображения не найдены',
    'status.emptyVideos': 'Видео не найдены',
    'status.emptyImagesSubtitle':
      'Потяните вниз для обновления или посмотрите чей-то статус',
    'status.emptyVideosSubtitle':
      'Потяните вниз для обновления или посмотрите чей-то статус',
    'status.emptySavedImages': 'Сохранённых изображений пока нет',
    'status.emptySavedVideos': 'Сохранённых видео пока нет',
    'viewer.shareMessage': 'Посмотрите этот статус!',
    'viewer.shareTitle': 'Поделиться статусом',
    'viewer.shareFailedTitle': 'Ошибка при отправке',
    'viewer.shareFailedMessage':
      'Не удалось поделиться этим статусом. Попробуйте снова.',
    'viewer.whatsappNotInstalledTitle': 'Приложение не установлено',
    'viewer.whatsappNotInstalledMessage':
      'Установите приложение, чтобы перепостить этот статус.',
    'viewer.repostMessage':
      'Отправка этого статуса — нажмите «Мой статус» для перепоста.',
    'viewer.repostTitle': 'Отправить Статус',
    'viewer.repostFailedMessage': 'Не удалось отправить. Попробуйте снова.',
  },
  fr: {
    'settings.title': 'Paramètres',
    'settings.appearance': 'Apparence',
    'settings.themeTitle': 'Thème',
    'settings.themeFollowSystem': 'Suivre le thème du système',
    'settings.themeDark': 'Mode sombre',
    'settings.themeLight': 'Mode clair',
    'settings.themeSystemShort': 'Système',
    'settings.themeDarkShort': 'Sombre',
    'settings.themeLightShort': 'Clair',
    'settings.languageTitle': "Langue de l'application",
    'settings.languageDescription': 'Choisissez la langue de l’app.',
    'settings.languageSelectLabel': 'Langue sélectionnée',
    'settings.directMessageTitle': 'Message direct',
    'settings.directMessageCardTitle': 'Discuter sans enregistrer le contact',
    'settings.directMessageCardSubtitle': 'Envoyez instantanément.',
    'settings.directMessageCountryPlaceholder': '+33',
    'settings.directMessageNumberPlaceholder': '0612345678',
    'settings.directMessageMessagePlaceholder': 'Message optionnel...',
    'settings.directMessageButton': 'Envoyer',
    'settings.directMessageAlertTitle': 'Numéro requis',
    'settings.directMessageAlertMessage':
      'Veuillez saisir un indicatif pays et un numéro valides.',
    'settings.directMessageWhatsappError': "Vérifiez que l'app est installée.",
    'settings.aboutTitle': 'À propos',
    'settings.aboutShare': "Partager l'app",
    'settings.aboutHelp': 'Aide',
    'settings.shareAppAlertTitle': "Partager l'app",
    'settings.shareAppAlertMessage':
      'Découvrez cette application incroyable pour sauvegarder les statuts !',
    'settings.versionLabel': 'Version 1.0.0',
    'settings.languageModalTitle': 'Choisissez une langue',
    'settings.accessibility.close': 'Fermer les réglages',
    'settings.accessibility.changeTheme': 'Changer le thème',
    'general.unavailableTitle': 'Indisponible',
    'general.unavailableMessage': 'Impossible d’ouvrir le lien demandé.',
    'tabs.images': 'IMAGES',
    'tabs.videos': 'VIDÉOS',
    'tabs.status': 'Statuts',
    'tabs.saved': 'Enregistré',
    'tabs.settings': 'Réglages',
    'tabs.imagesAccessibility': 'Passer à l’onglet images',
    'tabs.videosAccessibility': 'Passer à l’onglet vidéos',
    'tabs.statusAccessibility': 'Afficher les statuts récents',
    'tabs.savedAccessibility': 'Afficher les éléments enregistrés',
    'tabs.settingsAccessibility': 'Ouvrir les réglages',
    'status.errorLoadTitle': 'Échec du chargement des statuts',
    'status.errorLoadMessage': 'Veuillez réessayer dans un instant.',
    'status.savedTitle': 'Enregistré dans la galerie',
    'status.savedMessage':
      'Le statut est maintenant disponible dans vos téléchargements.',
    'status.errorSaveTitle': "Échec de l'enregistrement",
    'status.errorSaveMessage': 'Veuillez réessayer plus tard.',
    'status.errorPermissionTitle': "Une erreur s'est produite",
    'status.errorPermissionMessage':
      "Impossible d'ouvrir le sélecteur de dossier. Veuillez réessayer.",
    'status.emptyImages': 'Aucune image trouvée',
    'status.emptyVideos': 'Aucune vidéo trouvée',
    'status.emptyImagesSubtitle':
      "Tirez vers le bas pour actualiser ou consultez le statut de quelqu'un",
    'status.emptyVideosSubtitle':
      "Tirez vers le bas pour actualiser ou consultez le statut de quelqu'un",
    'status.emptySavedImages': 'Aucune image enregistrée pour le moment',
    'status.emptySavedVideos': 'Aucune vidéo enregistrée pour le moment',
    'viewer.shareMessage': 'Découvrez ce statut !',
    'viewer.shareTitle': 'Partager le statut',
    'viewer.shareFailedTitle': 'Échec du partage',
    'viewer.shareFailedMessage':
      'Impossible de partager ce statut. Réessayez bientôt.',
    'viewer.whatsappNotInstalledTitle': 'App non installée',
    'viewer.whatsappNotInstalledMessage':
      "Installez l'app pour reposter ce statut.",
    'viewer.repostMessage':
      'Partage de ce statut — appuyez sur Mon Statut pour reposter.',
    'viewer.repostTitle': 'Partager Statut',
    'viewer.repostFailedMessage': 'Impossible de partager. Réessayez bientôt.',
  },
  de: {
    'settings.title': 'Einstellungen',
    'settings.appearance': 'Darstellung',
    'settings.themeTitle': 'Design',
    'settings.themeFollowSystem': 'Systemdesign verwenden',
    'settings.themeDark': 'Dunkler Modus',
    'settings.themeLight': 'Heller Modus',
    'settings.themeSystemShort': 'System',
    'settings.themeDarkShort': 'Dunkel',
    'settings.themeLightShort': 'Hell',
    'settings.languageTitle': 'App-Sprache',
    'settings.languageDescription': 'Wähle die App-Sprache.',
    'settings.languageSelectLabel': 'Ausgewählte Sprache',
    'settings.directMessageTitle': 'Direktnachricht',
    'settings.directMessageCardTitle': 'Chat ohne Kontakt zu speichern',
    'settings.directMessageCardSubtitle': 'Sende sofort.',
    'settings.directMessageCountryPlaceholder': '+49',
    'settings.directMessageNumberPlaceholder': '15123456789',
    'settings.directMessageMessagePlaceholder': 'Optionale Nachricht...',
    'settings.directMessageButton': 'Senden',
    'settings.directMessageAlertTitle': 'Telefonnummer erforderlich',
    'settings.directMessageAlertMessage':
      'Bitte gib eine gültige Ländervorwahl und Telefonnummer ein.',
    'settings.directMessageWhatsappError':
      'Bitte prüfe, ob die App installiert ist.',
    'settings.aboutTitle': 'Über',
    'settings.aboutShare': 'App teilen',
    'settings.aboutHelp': 'Hilfe',
    'settings.shareAppAlertTitle': 'App teilen',
    'settings.shareAppAlertMessage':
      'Schau dir diese fantastische App zum Speichern von Status an!',
    'settings.versionLabel': 'Version 1.0.0',
    'settings.languageModalTitle': 'Sprache auswählen',
    'settings.accessibility.close': 'Einstellungen schließen',
    'settings.accessibility.changeTheme': 'Design ändern',
    'general.unavailableTitle': 'Nicht verfügbar',
    'general.unavailableMessage':
      'Der angeforderte Link konnte nicht geöffnet werden.',
    'tabs.images': 'BILDER',
    'tabs.videos': 'VIDEOS',
    'tabs.status': 'Status',
    'tabs.saved': 'Gespeichert',
    'tabs.settings': 'Einstellungen',
    'tabs.imagesAccessibility': 'Zur Bilder-Ansicht wechseln',
    'tabs.videosAccessibility': 'Zur Video-Ansicht wechseln',
    'tabs.statusAccessibility': 'Aktuelle Status anzeigen',
    'tabs.savedAccessibility': 'Gespeicherte Elemente anzeigen',
    'tabs.settingsAccessibility': 'Einstellungen öffnen',
    'status.errorLoadTitle': 'Status konnte nicht geladen werden',
    'status.errorLoadMessage': 'Bitte versuchen Sie es später erneut.',
    'status.savedTitle': 'In Galerie gespeichert',
    'status.savedMessage': 'Status ist jetzt in Ihren Downloads verfügbar.',
    'status.errorSaveTitle': 'Speichern fehlgeschlagen',
    'status.errorSaveMessage': 'Bitte versuchen Sie es später erneut.',
    'status.errorPermissionTitle': 'Etwas ist schief gelaufen',
    'status.errorPermissionMessage':
      'Ordnerauswahl konnte nicht geöffnet werden. Bitte erneut versuchen.',
    'status.emptyImages': 'Keine Bilder gefunden',
    'status.emptyVideos': 'Keine Videos gefunden',
    'status.emptyImagesSubtitle':
      'Ziehen Sie nach unten zum Aktualisieren oder sehen Sie sich jemandes Status an',
    'status.emptyVideosSubtitle':
      'Ziehen Sie nach unten zum Aktualisieren oder sehen Sie sich jemandes Status an',
    'status.emptySavedImages': 'Noch keine Bilder gespeichert',
    'status.emptySavedVideos': 'Noch keine Videos gespeichert',
    'viewer.shareMessage': 'Sieh dir diesen Status an!',
    'viewer.shareTitle': 'Status teilen',
    'viewer.shareFailedTitle': 'Teilen fehlgeschlagen',
    'viewer.shareFailedMessage':
      'Dieser Status konnte nicht geteilt werden. Versuchen Sie es erneut.',
    'viewer.whatsappNotInstalledTitle': 'App nicht installiert',
    'viewer.whatsappNotInstalledMessage':
      'Installieren Sie die App, um diesen Status zu reposten.',
    'viewer.repostMessage':
      'Teilen dieses Status — tippen Sie auf Mein Status, um zu reposten.',
    'viewer.repostTitle': 'Status Teilen',
    'viewer.repostFailedMessage':
      'Konnte nicht teilen. Versuchen Sie es erneut.',
  },
  it: {
    'settings.title': 'Impostazioni',
    'settings.appearance': 'Aspetto',
    'settings.themeTitle': 'Tema',
    'settings.themeFollowSystem': 'Segui il tema di sistema',
    'settings.themeDark': 'Modalità scura',
    'settings.themeLight': 'Modalità chiara',
    'settings.themeSystemShort': 'Sistema',
    'settings.themeDarkShort': 'Scuro',
    'settings.themeLightShort': 'Chiaro',
    'settings.languageTitle': "Lingua dell'app",
    'settings.languageDescription': 'Scegli la lingua dell’app.',
    'settings.languageSelectLabel': 'Lingua selezionata',
    'settings.directMessageTitle': 'Messaggio diretto',
    'settings.directMessageCardTitle': 'Chat senza salvare il contatto',
    'settings.directMessageCardSubtitle': 'Invia subito.',
    'settings.directMessageCountryPlaceholder': '+39',
    'settings.directMessageNumberPlaceholder': '3123456789',
    'settings.directMessageMessagePlaceholder': 'Messaggio facoltativo...',
    'settings.directMessageButton': 'Invia',
    'settings.directMessageAlertTitle': 'Numero richiesto',
    'settings.directMessageAlertMessage':
      'Inserisci un prefisso e un numero validi.',
    'settings.directMessageWhatsappError': "Verifica che l'app sia installata.",
    'settings.aboutTitle': 'Informazioni',
    'settings.aboutShare': 'Condividi app',
    'settings.aboutHelp': 'Aiuto',
    'settings.shareAppAlertTitle': 'Condividi app',
    'settings.shareAppAlertMessage':
      "Dai un'occhiata a questa fantastica app per salvare gli stati!",
    'settings.versionLabel': 'Versione 1.0.0',
    'settings.languageModalTitle': 'Scegli una lingua',
    'settings.accessibility.close': 'Chiudi impostazioni',
    'settings.accessibility.changeTheme': 'Cambia tema',
    'general.unavailableTitle': 'Non disponibile',
    'general.unavailableMessage': 'Impossibile aprire il link richiesto.',
    'tabs.images': 'IMMAGINI',
    'tabs.videos': 'VIDEO',
    'tabs.status': 'Stati',
    'tabs.saved': 'Salvati',
    'tabs.settings': 'Impostazioni',
    'tabs.imagesAccessibility': 'Passa alla scheda immagini',
    'tabs.videosAccessibility': 'Passa alla scheda video',
    'tabs.statusAccessibility': 'Mostra stati recenti',
    'tabs.savedAccessibility': 'Mostra elementi salvati',
    'tabs.settingsAccessibility': 'Apri impostazioni',
    'status.errorLoadTitle': 'Impossibile caricare gli stati',
    'status.errorLoadMessage': 'Riprova tra poco.',
    'status.savedTitle': 'Salvato nella galleria',
    'status.savedMessage': 'Lo stato è ora disponibile nei tuoi download.',
    'status.errorSaveTitle': 'Salvataggio fallito',
    'status.errorSaveMessage': 'Riprova più tardi.',
    'status.errorPermissionTitle': 'Qualcosa è andato storto',
    'status.errorPermissionMessage':
      'Impossibile aprire il selettore di cartelle. Riprova.',
    'status.emptyImages': 'Nessuna immagine trovata',
    'status.emptyVideos': 'Nessun video trovato',
    'status.emptyImagesSubtitle':
      'Scorri verso il basso per aggiornare o visualizza lo stato di qualcuno',
    'status.emptyVideosSubtitle':
      'Scorri verso il basso per aggiornare o visualizza lo stato di qualcuno',
    'status.emptySavedImages': 'Nessuna immagine salvata ancora',
    'status.emptySavedVideos': 'Nessun video salvato ancora',
    'viewer.shareMessage': 'Guarda questo stato!',
    'viewer.shareTitle': 'Condividi stato',
    'viewer.shareFailedTitle': 'Condivisione fallita',
    'viewer.shareFailedMessage':
      'Impossibile condividere questo stato. Riprova tra poco.',
    'viewer.whatsappNotInstalledTitle': 'App non installata',
    'viewer.whatsappNotInstalledMessage':
      "Installa l'app per ripostare questo stato.",
    'viewer.repostMessage':
      'Condivisione di questo stato — tocca Il mio stato per ripostare.',
    'viewer.repostTitle': 'Condividi Stato',
    'viewer.repostFailedMessage': 'Impossibile condividere. Riprova tra poco.',
  },
  nl: {
    'settings.title': 'Instellingen',
    'settings.appearance': 'Weergave',
    'settings.themeTitle': 'Thema',
    'settings.themeFollowSystem': 'Systeemthema volgen',
    'settings.themeDark': 'Donkere modus',
    'settings.themeLight': 'Lichte modus',
    'settings.themeSystemShort': 'Systeem',
    'settings.themeDarkShort': 'Donker',
    'settings.themeLightShort': 'Licht',
    'settings.languageTitle': 'App-taal',
    'settings.languageDescription': 'Kies de app-taal.',
    'settings.languageSelectLabel': 'Geselecteerde taal',
    'settings.directMessageTitle': 'Direct bericht',
    'settings.directMessageCardTitle': 'Chatten zonder contact op te slaan',
    'settings.directMessageCardSubtitle': 'Stuur direct.',
    'settings.directMessageCountryPlaceholder': '+31',
    'settings.directMessageNumberPlaceholder': '612345678',
    'settings.directMessageMessagePlaceholder': 'Optioneel bericht...',
    'settings.directMessageButton': 'Versturen',
    'settings.directMessageAlertTitle': 'Telefoonnummer vereist',
    'settings.directMessageAlertMessage':
      'Voer een geldige landcode en telefoonnummer in.',
    'settings.directMessageWhatsappError':
      'Controleer of de app is geïnstalleerd.',
    'settings.aboutTitle': 'Over',
    'settings.aboutShare': 'App delen',
    'settings.aboutHelp': 'Help',
    'settings.shareAppAlertTitle': 'App delen',
    'settings.shareAppAlertMessage':
      'Bekijk deze geweldige app om statussen op te slaan!',
    'settings.versionLabel': 'Versie 1.0.0',
    'settings.languageModalTitle': 'Kies een taal',
    'settings.accessibility.close': 'Instellingen sluiten',
    'settings.accessibility.changeTheme': 'Thema wijzigen',
    'general.unavailableTitle': 'Niet beschikbaar',
    'general.unavailableMessage':
      'De opgevraagde link kan niet worden geopend.',
    'tabs.images': 'AFBEELDINGEN',
    'tabs.videos': 'VIDEO’S',
    'tabs.status': 'Statussen',
    'tabs.saved': 'Opgeslagen',
    'tabs.settings': 'Instellingen',
    'tabs.imagesAccessibility': 'Overschakelen naar afbeeldings-tab',
    'tabs.videosAccessibility': 'Overschakelen naar video-tab',
    'tabs.statusAccessibility': 'Recente statussen tonen',
    'tabs.savedAccessibility': 'Opgeslagen items tonen',
    'tabs.settingsAccessibility': 'Instellingen openen',
    'status.errorLoadTitle': 'Laden van statussen mislukt',
    'status.errorLoadMessage': 'Probeer het over een moment opnieuw.',
    'status.savedTitle': 'Opgeslagen in galerij',
    'status.savedMessage': 'Status is nu beschikbaar in je downloads.',
    'status.errorSaveTitle': 'Opslaan mislukt',
    'status.errorSaveMessage': 'Probeer het later opnieuw.',
    'status.errorPermissionTitle': 'Er is iets misgegaan',
    'status.errorPermissionMessage':
      'Kan mappenkiezer niet openen. Probeer het opnieuw.',
    'status.emptyImages': 'Geen afbeeldingen gevonden',
    'status.emptyVideos': "Geen video's gevonden",
    'status.emptyImagesSubtitle':
      'Trek naar beneden om te vernieuwen of bekijk iemands status',
    'status.emptyVideosSubtitle':
      'Trek naar beneden om te vernieuwen of bekijk iemands status',
    'status.emptySavedImages': 'Nog geen afbeeldingen opgeslagen',
    'status.emptySavedVideos': "Nog geen video's opgeslagen",
    'viewer.shareMessage': 'Bekijk deze status!',
    'viewer.shareTitle': 'Status delen',
    'viewer.shareFailedTitle': 'Delen mislukt',
    'viewer.shareFailedMessage':
      'Deze status kon niet worden gedeeld. Probeer het opnieuw.',
    'viewer.whatsappNotInstalledTitle': 'App niet geïnstalleerd',
    'viewer.whatsappNotInstalledMessage':
      'Installeer de app om deze status opnieuw te posten.',
    'viewer.repostMessage':
      'Deze status delen — tik op Mijn Status om opnieuw te posten.',
    'viewer.repostTitle': 'Status Delen',
    'viewer.repostFailedMessage': 'Kan niet delen. Probeer het opnieuw.',
  },
};

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  options: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);

        if (stored && stored in TRANSLATIONS) {
          // User has previously set a language preference
          setLanguageState(stored as LanguageCode);
        } else {
          // First time user - detect device language
          const deviceLang = getDeviceLanguage();
          setLanguageState(deviceLang);
          // Save the detected language
          await AsyncStorage.setItem(STORAGE_KEY, deviceLang);
          console.log(`Auto-detected language: ${deviceLang}`);
        }
      } catch {
        // On error, default to English
        setLanguageState('en');
      }
    };

    initializeLanguage();
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => undefined);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const translate = (key: TranslationKey) =>
      TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;

    return {
      language,
      setLanguage,
      t: translate,
      options: LANGUAGE_OPTIONS,
    };
  }, [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
