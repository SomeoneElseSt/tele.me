import { createContext, createElement, useContext } from 'react'
import type { ReactNode } from 'react'

export type LocaleCode = 'en' | 'es' | 'ja' | 'hi' | 'fr' | 'de'

export const LOCALES: { code: LocaleCode; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'ja', label: '日本語', short: 'JA' },
  { code: 'hi', label: 'हिन्दी', short: 'HI' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'de', label: 'Deutsch', short: 'DE' }
]

type Strings = {
  defaultScript: string
  language: string
  script: string
  enableMarkdown: string
  close: string
  hidePrompter: string
  showPrompter: string
  controls: string
  drag: string
  mirrorText: string
  mirrorVideo: string
  speed: string
  textSize: string
  opacity: string
  text: string
  camera: string
  mic: string
  inputs: string
  videos: string
  record: string
  stopRecording: string
  startRecording: string
  playPrompter: string
  pausePrompter: string
  inputsTitle: string
  videosTitle: string
  noCameras: string
  noMics: string
  on: string
  off: string
  recordFirstVideo: string
  takeLabel: (index: number) => string
  downloadTakeLabel: (index: number) => string
}

const STRINGS: Record<LocaleCode, Strings> = {
  en: {
    defaultScript:
      'Your script goes here.\n\n' +
      'Space: play/pause\n' +
      'R: record\n' +
      'T: edit text\n' +
      'C: teleprompter controls\n' +
      'H: hide/show prompter\n' +
      'I: control inputs\n' +
      'D: download videos\n\n' +
      'To use markdown rendering and font, open the edit text pane (T) and enable it (M)',
    language: 'Language',
    script: 'Script',
    enableMarkdown: 'Enable Markdown',
    close: 'Close',
    hidePrompter: 'Hide prompter',
    showPrompter: 'Show prompter',
    controls: 'Controls',
    drag: 'Drag',
    mirrorText: 'Mirror text',
    mirrorVideo: 'Mirror video',
    speed: 'Speed',
    textSize: 'Text size',
    opacity: 'Opacity',
    text: 'Text',
    camera: 'Camera',
    mic: 'Mic',
    inputs: 'Inputs',
    videos: 'Videos',
    record: 'Record',
    stopRecording: 'Stop recording',
    startRecording: 'Start recording',
    playPrompter: 'Play prompter',
    pausePrompter: 'Pause prompter',
    inputsTitle: 'Inputs',
    videosTitle: 'Videos',
    noCameras: 'No cameras',
    noMics: 'No mics',
    on: 'On',
    off: 'Off',
    recordFirstVideo: 'Record your first video to download it.',
    takeLabel: (index) => `Take ${index}`,
    downloadTakeLabel: (index) => `Download take ${index}`
  },
  es: {
    defaultScript:
      'Tu guion va aquí.\n\n' +
      'Espacio: reproducir/pausar\n' +
      'R: grabar\n' +
      'T: editar texto\n' +
      'C: controles del teleprompter\n' +
      'H: ocultar/mostrar teleprompter\n' +
      'I: controlar entradas\n' +
      'D: descargar videos\n\n' +
      'Para usar el renderizado y la tipografía de markdown, abre el panel de edición de texto (T) y actívalo (M)',
    language: 'Idioma',
    script: 'Guion',
    enableMarkdown: 'Habilitar Markdown',
    close: 'Cerrar',
    hidePrompter: 'Ocultar prompter',
    showPrompter: 'Mostrar prompter',
    controls: 'Controles',
    drag: 'Arrastrar',
    mirrorText: 'Espejar texto',
    mirrorVideo: 'Espejar video',
    speed: 'Velocidad',
    textSize: 'Tamaño de texto',
    opacity: 'Opacidad',
    text: 'Texto',
    camera: 'Cámara',
    mic: 'Micrófono',
    inputs: 'Entradas',
    videos: 'Videos',
    record: 'Grabar',
    stopRecording: 'Detener grabación',
    startRecording: 'Iniciar grabación',
    playPrompter: 'Reproducir prompter',
    pausePrompter: 'Pausar prompter',
    inputsTitle: 'Entradas',
    videosTitle: 'Videos',
    noCameras: 'Sin cámaras',
    noMics: 'Sin micrófonos',
    on: 'Activado',
    off: 'Desactivado',
    recordFirstVideo: 'Graba tu primer video para descargarlo.',
    takeLabel: (index) => `Toma ${index}`,
    downloadTakeLabel: (index) => `Descargar toma ${index}`
  },
  ja: {
    defaultScript:
      'ここにスクリプトを書きます。\n\n' +
      'スペース: 再生/一時停止\n' +
      'R: 録画\n' +
      'T: テキスト編集\n' +
      'C: プロンプター操作\n' +
      'H: プロンプター表示/非表示\n' +
      'I: 入力設定\n' +
      'D: 動画をダウンロード\n\n' +
      'Markdown 表示と書式を使うには、テキスト編集パネル (T) を開いて有効化 (M) してください',
    language: '言語',
    script: 'スクリプト',
    enableMarkdown: 'Markdown を有効化',
    close: '閉じる',
    hidePrompter: 'プロンプターを隠す',
    showPrompter: 'プロンプターを表示',
    controls: 'コントロール',
    drag: 'ドラッグ',
    mirrorText: 'テキストを反転',
    mirrorVideo: '映像を反転',
    speed: '速度',
    textSize: '文字サイズ',
    opacity: '不透明度',
    text: 'テキスト',
    camera: 'カメラ',
    mic: 'マイク',
    inputs: '入力',
    videos: '動画',
    record: '録画',
    stopRecording: '録画停止',
    startRecording: '録画開始',
    playPrompter: 'プロンプター再生',
    pausePrompter: 'プロンプター停止',
    inputsTitle: '入力',
    videosTitle: '動画',
    noCameras: 'カメラなし',
    noMics: 'マイクなし',
    on: 'オン',
    off: 'オフ',
    recordFirstVideo: '最初の動画を録画してダウンロードしてください。',
    takeLabel: (index) => `テイク ${index}`,
    downloadTakeLabel: (index) => `テイク ${index} をダウンロード`
  },
  hi: {
    defaultScript:
      'आपकी स्क्रिप्ट यहाँ जाती है।\n\n' +
      'स्पेस: चलाएँ/रोकें\n' +
      'R: रिकॉर्ड\n' +
      'T: टेक्स्ट संपादित करें\n' +
      'C: टेलीप्रॉम्प्टर नियंत्रण\n' +
      'H: टेलीप्रॉम्प्टर दिखाएँ/छिपाएँ\n' +
      'I: इनपुट नियंत्रित करें\n' +
      'D: वीडियो डाउनलोड करें\n\n' +
      'Markdown रेंडरिंग और फ़ॉन्ट के लिए, टेक्स्ट संपादन पैन (T) खोलें और इसे सक्षम करें (M)',
    language: 'भाषा',
    script: 'स्क्रिप्ट',
    enableMarkdown: 'Markdown सक्षम करें',
    close: 'बंद करें',
    hidePrompter: 'टेलीप्रॉम्प्टर छिपाएँ',
    showPrompter: 'टेलीप्रॉम्प्टर दिखाएँ',
    controls: 'कंट्रोल्स',
    drag: 'खींचें',
    mirrorText: 'टेक्स्ट मिरर',
    mirrorVideo: 'वीडियो मिरर',
    speed: 'गति',
    textSize: 'टेक्स्ट आकार',
    opacity: 'अपारदर्शिता',
    text: 'टेक्स्ट',
    camera: 'कैमरा',
    mic: 'माइक',
    inputs: 'इनपुट',
    videos: 'वीडियो',
    record: 'रिकॉर्ड',
    stopRecording: 'रिकॉर्डिंग बंद करें',
    startRecording: 'रिकॉर्डिंग शुरू करें',
    playPrompter: 'टेलीप्रॉम्प्टर चलाएँ',
    pausePrompter: 'टेलीप्रॉम्प्टर रोकें',
    inputsTitle: 'इनपुट',
    videosTitle: 'वीडियो',
    noCameras: 'कोई कैमरा नहीं',
    noMics: 'कोई माइक्रोफ़ोन नहीं',
    on: 'चालू',
    off: 'बंद',
    recordFirstVideo: 'डाउनलोड करने के लिए अपना पहला वीडियो रिकॉर्ड करें।',
    takeLabel: (index) => `टेक ${index}`,
    downloadTakeLabel: (index) => `टेक ${index} डाउनलोड करें`
  },
  fr: {
    defaultScript:
      'Votre script va ici.\n\n' +
      'Espace : lecture/pause\n' +
      'R : enregistrer\n' +
      'T : éditer le texte\n' +
      'C : contrôles du prompteur\n' +
      'H : afficher/masquer le prompteur\n' +
      'I : contrôler les entrées\n' +
      'D : télécharger les vidéos\n\n' +
      'Pour utiliser le rendu et la police Markdown, ouvrez le panneau d’édition (T) et activez-le (M)',
    language: 'Langue',
    script: 'Script',
    enableMarkdown: 'Activer Markdown',
    close: 'Fermer',
    hidePrompter: 'Masquer le prompteur',
    showPrompter: 'Afficher le prompteur',
    controls: 'Contrôles',
    drag: 'Glisser',
    mirrorText: 'Miroir du texte',
    mirrorVideo: 'Miroir vidéo',
    speed: 'Vitesse',
    textSize: 'Taille du texte',
    opacity: 'Opacité',
    text: 'Texte',
    camera: 'Caméra',
    mic: 'Micro',
    inputs: 'Entrées',
    videos: 'Vidéos',
    record: 'Enregistrer',
    stopRecording: 'Arrêter l’enregistrement',
    startRecording: 'Démarrer l’enregistrement',
    playPrompter: 'Lire le prompteur',
    pausePrompter: 'Mettre en pause',
    inputsTitle: 'Entrées',
    videosTitle: 'Vidéos',
    noCameras: 'Aucune caméra',
    noMics: 'Aucun micro',
    on: 'Activé',
    off: 'Désactivé',
    recordFirstVideo: 'Enregistrez votre première vidéo pour la télécharger.',
    takeLabel: (index) => `Prise ${index}`,
    downloadTakeLabel: (index) => `Télécharger la prise ${index}`
  },
  de: {
    defaultScript:
      'Ihr Skript kommt hierher.\n\n' +
      'Leertaste: abspielen/pausieren\n' +
      'R: aufnehmen\n' +
      'T: Text bearbeiten\n' +
      'C: Teleprompter-Steuerung\n' +
      'H: Teleprompter ein-/ausblenden\n' +
      'I: Eingänge steuern\n' +
      'D: Videos herunterladen\n\n' +
      'Für Markdown-Rendering und Schrift öffnen Sie das Text-Panel (T) und aktivieren es (M)',
    language: 'Sprache',
    script: 'Skript',
    enableMarkdown: 'Markdown aktivieren',
    close: 'Schließen',
    hidePrompter: 'Teleprompter ausblenden',
    showPrompter: 'Teleprompter anzeigen',
    controls: 'Steuerung',
    drag: 'Ziehen',
    mirrorText: 'Text spiegeln',
    mirrorVideo: 'Video spiegeln',
    speed: 'Geschwindigkeit',
    textSize: 'Textgröße',
    opacity: 'Deckkraft',
    text: 'Text',
    camera: 'Kamera',
    mic: 'Mikro',
    inputs: 'Eingänge',
    videos: 'Videos',
    record: 'Aufnehmen',
    stopRecording: 'Aufnahme stoppen',
    startRecording: 'Aufnahme starten',
    playPrompter: 'Teleprompter abspielen',
    pausePrompter: 'Teleprompter pausieren',
    inputsTitle: 'Eingänge',
    videosTitle: 'Videos',
    noCameras: 'Keine Kameras',
    noMics: 'Keine Mikrofone',
    on: 'An',
    off: 'Aus',
    recordFirstVideo: 'Nehmen Sie Ihr erstes Video auf, um es herunterzuladen.',
    takeLabel: (index) => `Take ${index}`,
    downloadTakeLabel: (index) => `Take ${index} herunterladen`
  }
}

type I18nContextValue = {
  locale: LocaleCode
  strings: Strings
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  strings: STRINGS.en
})

export function I18nProvider({ locale, children }: { locale: LocaleCode; children: ReactNode }) {
  const strings = STRINGS[locale] ?? STRINGS.en
  return createElement(I18nContext.Provider, { value: { locale, strings } }, children)
}

export function useI18n() {
  return useContext(I18nContext)
}

export function getStrings(locale: LocaleCode) {
  return STRINGS[locale] ?? STRINGS.en
}
