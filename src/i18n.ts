import type { VehicleType } from './types';

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
  | 'myPosition'
  | 'continue'
  | 'back'
  | 'start'
  | 'welcome'
  | 'vehicleQuestion'
  | 'vehicleSubtitle'
  | 'cityQuestion'
  | 'citySubtitle'
  | 'cityChoose'
  | 'cityTitle'
  | 'languageQuestion'
  | 'languageSubtitle';

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
    continue: 'Continuer',
    back: 'Retour',
    start: 'Commencer',
    welcome: 'Bienvenue 👋',
    vehicleQuestion: 'Quel véhicule utilisez-vous ?',
    vehicleSubtitle: 'On optimisera vos tournées en fonction.',
    cityQuestion: 'Dans quelle ville ?',
    citySubtitle: 'Les adresses seront suggérées autour de cette ville.',
    cityChoose: 'Choisir une ville',
    cityTitle: 'Ville',
    languageQuestion: 'Choisissez votre langue',
    languageSubtitle: 'Interface, voix et navigation.',
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
    continue: 'Continuar',
    back: 'Volver',
    start: 'Empezar',
    welcome: 'Bienvenido 👋',
    vehicleQuestion: '¿Qué vehículo usas?',
    vehicleSubtitle: 'Optimizaremos tus rutas en función.',
    cityQuestion: '¿En qué ciudad?',
    citySubtitle: 'Las direcciones se sugerirán cerca de esta ciudad.',
    cityChoose: 'Elegir una ciudad',
    cityTitle: 'Ciudad',
    languageQuestion: 'Elige tu idioma',
    languageSubtitle: 'Interfaz, voz y navegación.',
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
    continue: 'Continue',
    back: 'Back',
    start: 'Start',
    welcome: 'Welcome 👋',
    vehicleQuestion: 'Which vehicle do you use?',
    vehicleSubtitle: 'We’ll optimize your routes accordingly.',
    cityQuestion: 'Which city?',
    citySubtitle: 'Addresses will be suggested around this city.',
    cityChoose: 'Choose a city',
    cityTitle: 'City',
    languageQuestion: 'Choose your language',
    languageSubtitle: 'Interface, voice, and navigation.',
  },
};

export const VEHICLE_LABELS: Record<AppLang, Record<VehicleType, string>> = {
  fr: { bike: 'Vélo', escooter: 'Trottinette', scooter: 'Scooter', car: 'Voiture' },
  es: { bike: 'Bici', escooter: 'Patinete', scooter: 'Scooter', car: 'Coche' },
  en: { bike: 'Bike', escooter: 'E-scooter', scooter: 'Scooter', car: 'Car' },
};

export function t(lang: AppLang, key: StringKey): string {
  return STRINGS[lang][key];
}
