import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  | 'tabs.settingsAccessibility';

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
    'settings.languageDescription':
      'Choose the language you prefer to see inside the app.',
    'settings.languageSelectLabel': 'Selected language',
    'settings.directMessageTitle': 'Direct Message',
    'settings.directMessageCardTitle': 'Chat without saving contact',
    'settings.directMessageCardSubtitle':
      'Send messages instantly. Country code is auto-detected—adjust if needed.',
    'settings.directMessageCountryPlaceholder': '+1',
    'settings.directMessageNumberPlaceholder': '0123456789',
    'settings.directMessageMessagePlaceholder': 'Optional message...',
    'settings.directMessageButton': 'Open in WhatsApp',
    'settings.directMessageAlertTitle': 'Phone number required',
    'settings.directMessageAlertMessage':
      'Please enter a valid country code and phone number.',
    'settings.directMessageWhatsappError':
      'Please check if WhatsApp is installed.',
    'settings.aboutTitle': 'About',
    'settings.aboutShare': 'Share app',
    'settings.aboutHelp': 'Help',
    'settings.shareAppAlertTitle': 'Share app',
    'settings.shareAppAlertMessage': 'Tell your friends about this app!',
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
    'settings.languageDescription':
      'Elige el idioma en el que prefieres ver la app.',
    'settings.languageSelectLabel': 'Idioma seleccionado',
    'settings.directMessageTitle': 'Mensaje directo',
    'settings.directMessageCardTitle': 'Chatear sin guardar contacto',
    'settings.directMessageCardSubtitle':
      'Envía mensajes al instante. El prefijo se detecta automáticamente; ajústalo si es necesario.',
    'settings.directMessageCountryPlaceholder': '+34',
    'settings.directMessageNumberPlaceholder': '612345678',
    'settings.directMessageMessagePlaceholder': 'Mensaje opcional...',
    'settings.directMessageButton': 'Abrir en WhatsApp',
    'settings.directMessageAlertTitle': 'Número requerido',
    'settings.directMessageAlertMessage':
      'Introduce un prefijo y número válidos.',
    'settings.directMessageWhatsappError':
      'Comprueba si WhatsApp está instalado.',
    'settings.aboutTitle': 'Acerca de',
    'settings.aboutShare': 'Compartir app',
    'settings.aboutHelp': 'Ayuda',
    'settings.shareAppAlertTitle': 'Compartir app',
    'settings.shareAppAlertMessage': '¡Cuenta a tus amigos sobre esta app!',
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
    'settings.languageDescription':
      'Escolha o idioma em que prefere ver o aplicativo.',
    'settings.languageSelectLabel': 'Idioma selecionado',
    'settings.directMessageTitle': 'Mensagem direta',
    'settings.directMessageCardTitle': 'Conversar sem salvar contato',
    'settings.directMessageCardSubtitle':
      'Envie mensagens instantaneamente. O código do país é detectado automaticamente — ajuste se necessário.',
    'settings.directMessageCountryPlaceholder': '+55',
    'settings.directMessageNumberPlaceholder': '11987654321',
    'settings.directMessageMessagePlaceholder': 'Mensagem opcional...',
    'settings.directMessageButton': 'Abrir no WhatsApp',
    'settings.directMessageAlertTitle': 'Número obrigatório',
    'settings.directMessageAlertMessage':
      'Informe um código de país e número válidos.',
    'settings.directMessageWhatsappError':
      'Verifique se o WhatsApp está instalado.',
    'settings.aboutTitle': 'Sobre',
    'settings.aboutShare': 'Compartilhar app',
    'settings.aboutHelp': 'Ajuda',
    'settings.shareAppAlertTitle': 'Compartilhar app',
    'settings.shareAppAlertMessage': 'Conte para seus amigos sobre este app!',
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
    'settings.languageDescription':
      'Выберите язык, на котором хотите видеть приложение.',
    'settings.languageSelectLabel': 'Выбранный язык',
    'settings.directMessageTitle': 'Прямое сообщение',
    'settings.directMessageCardTitle': 'Чат без сохранения контакта',
    'settings.directMessageCardSubtitle':
      'Отправляйте сообщения мгновенно. Код страны определяется автоматически — при необходимости измените.',
    'settings.directMessageCountryPlaceholder': '+7',
    'settings.directMessageNumberPlaceholder': '9123456789',
    'settings.directMessageMessagePlaceholder': 'Необязательное сообщение...',
    'settings.directMessageButton': 'Открыть в WhatsApp',
    'settings.directMessageAlertTitle': 'Нужен номер телефона',
    'settings.directMessageAlertMessage':
      'Введите корректный код страны и номер телефона.',
    'settings.directMessageWhatsappError': 'Проверьте, установлен ли WhatsApp.',
    'settings.aboutTitle': 'О приложении',
    'settings.aboutShare': 'Поделиться приложением',
    'settings.aboutHelp': 'Помощь',
    'settings.shareAppAlertTitle': 'Поделиться приложением',
    'settings.shareAppAlertMessage': 'Расскажите друзьям об этом приложении!',
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
    'settings.languageDescription':
      "Choisissez la langue dans laquelle vous préférez voir l'application.",
    'settings.languageSelectLabel': 'Langue sélectionnée',
    'settings.directMessageTitle': 'Message direct',
    'settings.directMessageCardTitle': 'Discuter sans enregistrer le contact',
    'settings.directMessageCardSubtitle':
      'Envoyez des messages instantanément. Le préfixe est détecté automatiquement — ajustez-le si nécessaire.',
    'settings.directMessageCountryPlaceholder': '+33',
    'settings.directMessageNumberPlaceholder': '0612345678',
    'settings.directMessageMessagePlaceholder': 'Message optionnel...',
    'settings.directMessageButton': 'Ouvrir dans WhatsApp',
    'settings.directMessageAlertTitle': 'Numéro requis',
    'settings.directMessageAlertMessage':
      'Veuillez saisir un indicatif pays et un numéro valides.',
    'settings.directMessageWhatsappError':
      'Vérifiez que WhatsApp est installé.',
    'settings.aboutTitle': 'À propos',
    'settings.aboutShare': 'Partager l’app',
    'settings.aboutHelp': 'Aide',
    'settings.shareAppAlertTitle': 'Partager l’app',
    'settings.shareAppAlertMessage': 'Parlez de cette app à vos amis !',
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
    'settings.languageDescription':
      'Wähle die Sprache, in der die App angezeigt werden soll.',
    'settings.languageSelectLabel': 'Ausgewählte Sprache',
    'settings.directMessageTitle': 'Direktnachricht',
    'settings.directMessageCardTitle': 'Chat ohne Kontakt zu speichern',
    'settings.directMessageCardSubtitle':
      'Sende Nachrichten sofort. Die Ländervorwahl wird automatisch erkannt – passe sie bei Bedarf an.',
    'settings.directMessageCountryPlaceholder': '+49',
    'settings.directMessageNumberPlaceholder': '15123456789',
    'settings.directMessageMessagePlaceholder': 'Optionale Nachricht...',
    'settings.directMessageButton': 'In WhatsApp öffnen',
    'settings.directMessageAlertTitle': 'Telefonnummer erforderlich',
    'settings.directMessageAlertMessage':
      'Bitte gib eine gültige Ländervorwahl und Telefonnummer ein.',
    'settings.directMessageWhatsappError':
      'Bitte prüfe, ob WhatsApp installiert ist.',
    'settings.aboutTitle': 'Über',
    'settings.aboutShare': 'App teilen',
    'settings.aboutHelp': 'Hilfe',
    'settings.shareAppAlertTitle': 'App teilen',
    'settings.shareAppAlertMessage': 'Erzähle deinen Freunden von dieser App!',
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
    'settings.languageDescription':
      "Scegli la lingua in cui preferisci vedere l'app.",
    'settings.languageSelectLabel': 'Lingua selezionata',
    'settings.directMessageTitle': 'Messaggio diretto',
    'settings.directMessageCardTitle': 'Chat senza salvare il contatto',
    'settings.directMessageCardSubtitle':
      'Invia messaggi all’istante. Il prefisso viene rilevato automaticamente: modificalo se necessario.',
    'settings.directMessageCountryPlaceholder': '+39',
    'settings.directMessageNumberPlaceholder': '3123456789',
    'settings.directMessageMessagePlaceholder': 'Messaggio facoltativo...',
    'settings.directMessageButton': 'Apri in WhatsApp',
    'settings.directMessageAlertTitle': 'Numero richiesto',
    'settings.directMessageAlertMessage':
      'Inserisci un prefisso e un numero validi.',
    'settings.directMessageWhatsappError':
      'Verifica che WhatsApp sia installato.',
    'settings.aboutTitle': 'Informazioni',
    'settings.aboutShare': 'Condividi app',
    'settings.aboutHelp': 'Aiuto',
    'settings.shareAppAlertTitle': 'Condividi app',
    'settings.shareAppAlertMessage': 'Parla di questa app ai tuoi amici!',
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
    'settings.languageDescription': 'Kies de taal waarin je de app wilt zien.',
    'settings.languageSelectLabel': 'Geselecteerde taal',
    'settings.directMessageTitle': 'Direct bericht',
    'settings.directMessageCardTitle': 'Chatten zonder contact op te slaan',
    'settings.directMessageCardSubtitle':
      'Verstuur direct berichten. De landcode wordt automatisch gedetecteerd — pas indien nodig aan.',
    'settings.directMessageCountryPlaceholder': '+31',
    'settings.directMessageNumberPlaceholder': '612345678',
    'settings.directMessageMessagePlaceholder': 'Optioneel bericht...',
    'settings.directMessageButton': 'Openen in WhatsApp',
    'settings.directMessageAlertTitle': 'Telefoonnummer vereist',
    'settings.directMessageAlertMessage':
      'Voer een geldige landcode en telefoonnummer in.',
    'settings.directMessageWhatsappError':
      'Controleer of WhatsApp is geïnstalleerd.',
    'settings.aboutTitle': 'Over',
    'settings.aboutShare': 'App delen',
    'settings.aboutHelp': 'Help',
    'settings.shareAppAlertTitle': 'App delen',
    'settings.shareAppAlertMessage': 'Vertel je vrienden over deze app!',
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
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (stored && stored in TRANSLATIONS) {
          setLanguageState(stored as LanguageCode);
        }
      })
      .catch(() => undefined);
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
