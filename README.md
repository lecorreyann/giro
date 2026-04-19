# Giro

Application mobile d'optimisation de tournées de livraison avec navigation GPS en temps réel.

Planifiez vos arrêts (adresse + heure demandée), laissez l'algorithme optimiser l'ordre en tenant compte du trafic, puis naviguez avec instructions vocales pas-à-pas.

---

## Fonctionnalités

- **Planification** : saisie d'adresses (dictée vocale + autocomplétion biaisée sur votre ville) avec heure souhaitée par arrêt
- **Optimisation** glouton priorisant les fenêtres horaires, pondéré par le retard (× 3) et l'avance (× 0.1)
- **Trafic live** via TomTom Routing API (`traffic=true` + `departAt`)
- **Drag-and-drop** pour réordonner manuellement l'itinéraire proposé
- **Navigation GPS fullscreen** : carte Apple Maps / Leaflet, caméra qui suit, route consommée dynamiquement, instructions progressives
- **Détection hors-route + reroute auto** (seuil 60 m sur 5 s, cooldown 15 s)
- **Synthèse vocale** des instructions (`es-ES` par défaut)
- **Onboarding** 2 étapes (véhicule + ville) persistant via AsyncStorage

## Stack technique

| Couche | Tech |
|---|---|
| Framework | Expo SDK 54 (bare + dev client) |
| Runtime | React 19 · React Native 0.81 |
| Langage | TypeScript |
| Cartes | `react-native-maps` (iOS/Android, Apple Maps) · `react-leaflet` (web) |
| Géoloc | `expo-location` (watch position) |
| Voix | `expo-speech-recognition` (iOS/Android natif) · Web Speech API · `expo-speech` (TTS) |
| Routage | TomTom Routing + Search APIs (freemium 2500 req/jour) |
| Persistance | `@react-native-async-storage/async-storage` |
| DnD | `@dnd-kit/*` (web) · flèches ▲▼ (natif) |
| UI | Design tokens custom (Qonto/Revolut-style), `@expo/vector-icons` Feather/MaterialCommunityIcons |

---

## Prérequis

- **macOS** pour build iOS (Xcode obligatoire)
- **Node ≥ 20** (Metro 0.83+ utilise `Array.prototype.toReversed`)
- **pnpm** (ou npm/yarn — adaptez les commandes)
- **Xcode ≥ 15** avec SDK iOS correspondant à votre device
- **CocoaPods** (`brew install cocoapods`)
- **Apple ID** personnel pour signer (gratuit, validité 7 jours) ou compte développeur Apple ($99/an)
- **Android Studio** + SDK 34 pour builder Android
- **Clé API TomTom** gratuite ([developer.tomtom.com](https://developer.tomtom.com))

---

## Installation

```bash
git clone git@github.com:lecorreyann/giro.git
cd giro
pnpm install
```

### Variables d'environnement

Créer `.env.local` à la racine :

```bash
EXPO_PUBLIC_TOMTOM_API_KEY=votre_clef_tomtom
```

Sans cette clé, l'app bascule automatiquement sur OSRM public + Nominatim (moins précis, pas de trafic live).

---

## Lancer en dev

### Web

```bash
pnpm start --web
```
Aucun build natif requis. Marche dans Chrome/Edge (micro via Web Speech API).

### iOS (dev client)

1. Brancher l'iPhone en USB et accepter la confiance du Mac.
2. Activer le **Mode développeur** sur l'iPhone : *Réglages → Confidentialité et sécurité → Mode développeur*.
3. Dans Xcode → *Settings → Accounts* : ajouter votre Apple ID.
4. Ouvrir le workspace :
   ```bash
   open ios/giro.xcworkspace
   ```
   *Signing & Capabilities* → cocher **Automatically manage signing** → sélectionner votre Personal Team.
5. Prebuild + lancement :
   ```bash
   npx expo prebuild --clean
   npx expo run:ios --device
   ```
6. Sur l'iPhone au 1er lancement : *Réglages → Général → VPN et gestion de l'appareil* → faire confiance à votre Apple ID.

Metro doit tourner en parallèle : `pnpm start --dev-client`.

### Android (dev client)

```bash
npx expo prebuild --clean
npx expo run:android
```

Un émulateur Android Studio doit tourner ou un device USB en mode débogage.

---

## Build pour production

### iOS — usage personnel (App Store non requis)

**Option gratuite (validité 7 jours)** :
```bash
npx expo run:ios --device --configuration Release
```
L'app est installée avec JS bundlé, fonctionne hors connexion. Après 7 jours, rebrancher et relancer la commande.

**Option TestFlight (Apple Developer $99/an)** via EAS :
```bash
npx eas build --platform ios --profile preview
```
Puis distribuer via TestFlight ou installation ad-hoc.

### Android — APK installable sans store

```bash
npx eas build --platform android --profile preview
```

Génère un `.apk` téléchargeable depuis le dashboard EAS. Installation directe sur le device (autoriser les sources inconnues dans les paramètres Android).

Pour un build local sans EAS :
```bash
npx expo run:android --variant release
```

---

## Structure

```
src/
├── components/          UI components (cards, modals, selectors)
├── hooks/               useSettings, useUserLocation, useNavigationProgress, useSpeechRecognition
├── screens/             PlanView, NavigationView, OnboardingScreen, SettingsScreen
├── services/            tomtom (routing + search), routing (orchestrator + OSRM fallback)
├── utils/geo.ts         haversine + projection polyligne
├── theme.ts             design tokens (colors, radii, space, type)
└── types.ts             Stop, RouteLeg, RouteResult, VehicleType, Coord
```

### Points d'architecture

- **Metro platform extensions** : `*.native.tsx` / `*.web.tsx` résolus automatiquement
- **Settings persistés** dans AsyncStorage via `useSettings` hook
- **État centralisé** dans `RoutePlannerScreen` (PlanView et NavigationView sont des vues)
- **Module vocal dual** : hook natif avec `require()` défensif pour éviter le crash en Expo Go

---

## Licence

Usage personnel. Pas de redistribution.
