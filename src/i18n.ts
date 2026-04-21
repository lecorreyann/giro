export type AppLang = 'fr' | 'es' | 'en';

export const APP_LANGS: AppLang[] = ['fr', 'es', 'en'];

export const LANG_LABEL: Record<AppLang, string> = {
  fr: 'Français',
  es: 'Español',
  en: 'English',
};

export const LANG_FLAG: Record<AppLang, string> = {
  fr: '🇫🇷',
  es: '🇪🇸',
  en: '🇬🇧',
};

export const VOICE_LANG: Record<AppLang, string> = {
  fr: 'fr-FR',
  es: 'es-ES',
  en: 'en-US',
};

type StringKey =
  | 'addressPlaceholder'
  | 'tapToType'
  | 'tapToTypeShort'
  | 'startAddress'
  | 'searchHint'
  | 'noSuggestion'
  | 'listening'
  | 'myPosition';

export const STRINGS: Record<AppLang, Record<StringKey, string>> = {
  fr: {
    addressPlaceholder: 'Rue, avenue, numéro…',
    tapToType: 'Toucher pour saisir une adresse',
    tapToTypeShort: 'Toucher pour saisir',
    startAddress: 'Adresse de départ',
    searchHint: 'Tapez ou dictez au moins 3 caractères',
    noSuggestion: 'Aucune suggestion',
    listening: 'À l’écoute…',
    myPosition: 'Ma position',
  },
  es: {
    addressPlaceholder: 'Calle, avenida, número…',
    tapToType: 'Toca para escribir una dirección',
    tapToTypeShort: 'Toca para escribir',
    startAddress: 'Dirección de salida',
    searchHint: 'Escribe o dicta al menos 3 caracteres',
    noSuggestion: 'Sin sugerencias',
    listening: 'Escuchando…',
    myPosition: 'Mi posición',
  },
  en: {
    addressPlaceholder: 'Street, avenue, number…',
    tapToType: 'Tap to enter an address',
    tapToTypeShort: 'Tap to enter',
    startAddress: 'Starting address',
    searchHint: 'Type or dictate at least 3 characters',
    noSuggestion: 'No suggestions',
    listening: 'Listening…',
    myPosition: 'My location',
  },
};

export function t(lang: AppLang, key: StringKey): string {
  return STRINGS[lang][key];
}
