import { createContext, createElement, useContext } from 'react'
import type { ReactNode } from 'react'

export type LocaleCode = 'en' | 'es' | 'ja' | 'hi' | 'fr' | 'de' | 'zh' | 'ar' | 'pt' | 'ru' | 'pl'

export const LOCALES: { code: LocaleCode; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'ja', label: '日本語', short: 'JA' },
  { code: 'hi', label: 'हिन्दी', short: 'HI' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'zh', label: '中文', short: 'ZH' },
  { code: 'ar', label: 'العربية', short: 'AR' },
  { code: 'pt', label: 'Português', short: 'PT' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'pl', label: 'Polski', short: 'PL' }
]

type Strings = {
  defaultScript: string
  language: string
  script: string
  saveScript: string
  scriptSaved: string
  deleteSavedScript: string
  savedScripts: string
  noSavedScripts: string
  savedScriptsInfo: string
  replaceCurrentScript: string
  backToScript: string
  backToSavedScripts: string
  savedAt: string
  savedScriptPreview: string
  emptySavedScript: string
  enableMarkdown: string
  close: string
  hidePrompter: string
  showPrompter: string
  controls: string
  drag: string
  mirrorText: string
  alignLeft: string
  alignCenter: string
  alignRight: string
  mirrorVideo: string
  speed: string
  textSize: string
  opacity: string
  text: string
  camera: string
  mic: string
  inputs: string
  videos: string
  download: string
  record: string
  stopRecording: string
  startRecording: string
  playPrompter: string
  pausePrompter: string
  playVideo: string
  pauseVideo: string
  inputsTitle: string
  videosTitle: string
  noCameras: string
  noMics: string
  on: string
  off: string
  recordFirstVideo: string
  takeLabel: (index: number) => string
  downloadTakeLabel: (index: number) => string
  deleteTakeLabel: (index: number) => string
  storageTooltip: string
  memoryWarningTitle: string
  memoryWarningMessage: string
  browserWarningTitle: string
  browserWarningMessage: string
  continue: string
  confirm: string
  clearAll: string
  deleteAllConfirm: string
  confirmQuestion: string
  inputsTooltip: string
  aboutMessage: string
  fullscreen: string
  enterFullscreen: string
  exitFullscreen: string
  fixToTop: string
  unfixFromTop: string
  persistVideos: string
  persistVideosTooltip: string
  persistVideosWillSave10: string
  maxVideosReached: string
  deleteKey: string
  popOutPrompter: string
  popInPrompter: string
  pipEditHint: string
  popOutOnlyChrome: string
  allowCameraAccess: string
  braveBlockedMessage: string
  autoScroll: string
  autoScrolling: string
  autoScrollStartPlaying: string
  autoScrollSpeed: string
  autoScrollSpeedTooltip: string
  shortcutsMenu: string
  shortcutsTitle: string
  speakingTime: string
  trimVideo: string
  exitTrim: string
  audioSilentWarningMessage: string
  processingVideoTooltip: string
  prompterCountdown: string
  prompterCountdownMinutes: string
  prompterCountdownSeconds: string
  prompterCountdownSet: string
  prompterCountdownStart: string
  prompterCountdownPause: string
  prompterCountdownReset: string
  prompterCountdownEditDuration: string
}

export const STRINGS: Record<LocaleCode, Strings> = {
  en: {
    defaultScript:
      'Your script goes here.\n\n' +
      'T: edit text\n' +
      'R: record/stop recording\n' +
      'D: show and download videos\n' +
      'Space: play/pause\n' +
      'C: teleprompter controls\n' +
      'P: pop teleprompter out/in\n' +
      'Y: fix/unfix from top\n' +
      'H: hide/show prompter\n' +
      'I: control inputs\n' +
      'M: enable markdown\n' +
      'V: Autoscroll\n' +
      'F: fullscreen',
    language: 'Language',
    script: 'Script',
    enableMarkdown: 'Enable Markdown',
    close: 'Close',
    saveScript: 'Save',
    scriptSaved: 'Saved',
    deleteSavedScript: 'Delete saved script',
    savedScripts: 'Saved Scripts',
    noSavedScripts: 'No saved scripts yet.',
    savedScriptsInfo: 'Saved locally in this browser.',
    replaceCurrentScript: 'Replace Current Script',
    backToScript: 'Back to script',
    backToSavedScripts: 'Back to list',
    savedAt: 'Saved',
    savedScriptPreview: 'Saved Script',
    emptySavedScript: '(Empty script)',
    hidePrompter: 'Hide prompter',
    showPrompter: 'Show prompter',
    controls: 'Controls',
    drag: 'Drag',
    mirrorText: 'Mirror text',
    alignLeft: 'Left',
    alignCenter: 'Center',
    alignRight: 'Right',
    mirrorVideo: 'Mirror video',
    speed: 'Speed',
    textSize: 'Text size',
    opacity: 'Opacity',
    text: 'Edit Text',
    camera: 'Camera',
    mic: 'Mic',
    inputs: 'Inputs',
    videos: 'Videos',
    download: 'Download',
    record: 'Record',
    stopRecording: 'Stop recording',
    startRecording: 'Start recording',
    playPrompter: 'Play prompter',
    pausePrompter: 'Pause prompter',
    playVideo: 'Play Video',
    pauseVideo: 'Pause video',
    inputsTitle: 'Inputs',
    videosTitle: 'Videos',
    noCameras: 'No cameras',
    noMics: 'No mics',
    on: 'On',
    off: 'Off',
    recordFirstVideo: 'Record your first video to download it.',
    takeLabel: (index) => `Take ${index}`,
    downloadTakeLabel: (index) => `Download take ${index}`,
    deleteTakeLabel: (index) => `Delete Take ${index}`,
    storageTooltip: "Browser storage used by your recordings. You can't record past 90%. Delete videos to free up space.",
    memoryWarningTitle: 'Videos are stored locally',
    memoryWarningMessage: "Many recordings may use significant memory. Download and delete recordings you don't need.",
    browserWarningTitle: 'Browser Compatibility',
    browserWarningMessage: 'teleme works best in Chrome due to compatibility limitations. There are known bugs when used in different browsers.',
    continue: 'Continue',
    confirm: 'Confirm',
    clearAll: 'Clear all',
    deleteAllConfirm: 'Delete all?',
    confirmQuestion: 'Confirm?',
    inputsTooltip: 'Inputs',
    aboutMessage: 'teleme is an open-source teleprompter - 100% free, no login required, and browser-based. It was developed by ',
    fullscreen: 'Fullscreen',
    enterFullscreen: 'Enter Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    fixToTop: 'Fix to top',
    unfixFromTop: 'Unfix from top',
    persistVideos: 'Save videos locally',
    persistVideosTooltip: 'By default videos are saved on local memory and limited to 10 videos saved at a time. Disable to enable temporary storage and download all recorded videos before refreshing the website.',
    persistVideosWillSave10: 'Will save the 10 most recent videos locally. Enable to keep them across reloads.',
    maxVideosReached: 'Storage is almost full. Download and delete videos to record more.',
    deleteKey: 'delete',
    popOutPrompter: 'Pop Out',
    popInPrompter: 'Pop In',
    pipEditHint: 'To edit text, go back to the website and open the text editor panel (T).',
    popOutOnlyChrome: 'Pop out mode is not possible on Safari. Use Chrome for better compatibility.',
    allowCameraAccess: 'Allow camera access',
    braveBlockedMessage: 'Brave blocked camera access. Click the Shields icon or the Lock icon in the address bar to reset permissions and disable Fingerprinting Protection for this site. Use Chrome for better compatibility.',
    autoScroll: 'Autoscroll',
    autoScrolling: 'Autoscrolling',
    autoScrollStartPlaying: 'Start playing to autoscroll',
    autoScrollSpeed: 'Auto-scroll speed',
    autoScrollSpeedTooltip: 'Words per minute when auto-scrolling',
    shortcutsMenu:
      'T: edit text\n' +
      'R: record/stop recording\n' +
      'D: show and download videos\n' +
      'Space: play/pause\n' +
      'C: teleprompter controls\n' +
      'P: pop teleprompter out/in\n' +
      'Y: fix/unfix from top\n' +
      'H: hide/show prompter\n' +
      'I: control inputs\n' +
      'M: enable markdown\n' +
      'V: Autoscroll\n' +
      'F: fullscreen',
    shortcutsTitle: 'Shortcuts',
    speakingTime: 'Speaking Time',
    trimVideo: 'Trim video',
    exitTrim: 'Exit trim',
    audioSilentWarningMessage: "It seems no audio is coming through. Try speaking up, and if this message doesn't go away, reload your browser.",
    processingVideoTooltip: 'Video is being processed, please wait a moment',
    prompterCountdown: 'Take countdown',
    prompterCountdownMinutes: 'Min',
    prompterCountdownSeconds: 'Sec',
    prompterCountdownSet: 'Set duration',
    prompterCountdownStart: 'Start countdown',
    prompterCountdownPause: 'Pause countdown',
    prompterCountdownReset: 'Reset countdown',
    prompterCountdownEditDuration: 'Change duration',
  },
  es: {
    defaultScript:
      'Tu guion va aquí.\n\n' +
      'T: editar texto\n' +
      'R: grabar/detener grabación\n' +
      'D: mostrar y descargar videos\n' +
      'Espacio: reproducir/pausar\n' +
      'C: controles del teleprompter\n' +
      'P: abrir/cerrar teleprompter en ventana\n' +
      'Y: fijar/desfijar arriba\n' +
      'H: ocultar/mostrar teleprompter\n' +
      'I: controlar entradas\n' +
      'M: habilitar markdown\n' +
      'V: Desplazamiento automático\n' +
      'F: pantalla completa',
    language: 'Idioma',
    script: 'Guion',
    enableMarkdown: 'Habilitar Markdown',
    close: 'Cerrar',
    saveScript: 'Guardar',
    scriptSaved: 'Guardado',
    deleteSavedScript: 'Eliminar script guardado',
    savedScripts: 'Scripts guardados',
    noSavedScripts: 'Aún no hay scripts guardados.',
    savedScriptsInfo: 'Guardados localmente en este navegador.',
    replaceCurrentScript: 'Reemplazar script actual',
    backToScript: 'Volver al script',
    backToSavedScripts: 'Volver a la lista',
    savedAt: 'Guardado',
    savedScriptPreview: 'Script guardado',
    emptySavedScript: '(Script vacío)',
    hidePrompter: 'Ocultar prompter',
    showPrompter: 'Mostrar prompter',
    controls: 'Controles',
    drag: 'Arrastrar',
    mirrorText: 'Espejar texto',
    alignLeft: 'Izquierda',
    alignCenter: 'Centro',
    alignRight: 'Derecha',
    mirrorVideo: 'Espejar video',
    speed: 'Velocidad',
    textSize: 'Tamaño de texto',
    opacity: 'Opacidad',
    text: 'Editar texto',
    camera: 'Cámara',
    mic: 'Micrófono',
    inputs: 'Entradas',
    videos: 'Videos',
    download: 'Descargar',
    record: 'Grabar',
    stopRecording: 'Detener grabación',
    startRecording: 'Iniciar grabación',
    playPrompter: 'Reproducir prompter',
    pausePrompter: 'Pausar prompter',
    playVideo: 'Reproducir video',
    pauseVideo: 'Pausar video',
    inputsTitle: 'Entradas',
    videosTitle: 'Videos',
    noCameras: 'Sin cámaras',
    noMics: 'Sin micrófonos',
    on: 'Activado',
    off: 'Desactivado',
    recordFirstVideo: 'Graba tu primer video para descargarlo.',
    takeLabel: (index) => `Toma ${index}`,
    downloadTakeLabel: (index) => `Descargar toma ${index}`,
    deleteTakeLabel: (index) => `Eliminar toma ${index}`,
    storageTooltip: 'Almacenamiento del navegador usado por tus grabaciones. No puedes grabar más del 90%. Elimina videos para liberar espacio.',
    memoryWarningTitle: 'Los videos están almacenados localmente',
    memoryWarningMessage: 'Muchas grabaciones pueden usar mucha memoria. Descarga y elimina las grabaciones que no necesites.',
    browserWarningTitle: 'Compatibilidad del navegador',
    browserWarningMessage: 'teleme funciona mejor en Chrome debido a limitaciones de compatibilidad. Hay errores conocidos al usar otros navegadores.',
    continue: 'Continuar',
    confirm: 'Confirmar',
    clearAll: 'Borrar todo',
    deleteAllConfirm: '¿Borrar todo?',
    confirmQuestion: '¿Confirmar?',
    inputsTooltip: 'Entradas',
    aboutMessage: 'teleme es un teleprompter de código abierto - 100% gratis, no requiere registro y basado en navegador. Fue desarrollado por ',
    fullscreen: 'Pantalla completa',
    enterFullscreen: 'Entrar a pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    fixToTop: 'Fijar arriba',
    unfixFromTop: 'Desfijar de arriba',
    persistVideos: 'Guardar videos localmente',
    persistVideosTooltip: 'Por defecto, los videos se guardan en la memoria local y se limitan a 10 videos guardados a la vez. Desactívalo para habilitar el almacenamiento temporal y descarga todos los videos grabados antes de recargar el sitio web.',
    persistVideosWillSave10: 'Guardará los 10 videos más recientes localmente. Activa para mantenerlos entre recargas.',
    maxVideosReached: 'Máximo de 10 videos pueden guardarse localmente. Elimina algunos videos o desactiva el almacenamiento persistente para grabar más.',
    deleteKey: 'delete',
    popOutPrompter: 'Sacar',
    popInPrompter: 'Integrar',
    pipEditHint: 'Para editar el texto, regresa al sitio web y abre el panel del editor de texto (T).',
    popOutOnlyChrome: 'El modo de ventana emergente no es posible en Safari. Usa Chrome para una mejor compatibilidad.',
    allowCameraAccess: 'Permitir acceso a la cámara',
    braveBlockedMessage: 'Brave bloqueó el acceso a la cámara. Haz clic en el icono de Shields o en el icono del candado en la barra de direcciones para restablecer los permisos y desactivar la protección contra huellas digitales para este sitio. Usa Chrome para una mejor compatibilidad.',
    autoScroll: 'Desplazamiento automático',
    autoScrolling: 'Desplazamiento automático en curso',
    autoScrollStartPlaying: 'Reproduce para activar el desplazamiento automático',
    autoScrollSpeed: 'Velocidad de desplazamiento automático',
    autoScrollSpeedTooltip: 'Palabras por minuto en desplazamiento automático',
    shortcutsMenu:
      'T: editar texto\n' +
      'R: grabar/detener grabación\n' +
      'D: mostrar y descargar videos\n' +
      'Espacio: reproducir/pausar\n' +
      'C: controles del teleprompter\n' +
      'P: abrir/cerrar teleprompter en ventana\n' +
      'Y: fijar/desfijar arriba\n' +
      'H: ocultar/mostrar teleprompter\n' +
      'I: controlar entradas\n' +
      'M: habilitar markdown\n' +
      'V: desplazamiento automático\n' +
      'F: pantalla completa',
    shortcutsTitle: 'Atajos',
    speakingTime: 'Tiempo de habla',
    trimVideo: 'Recortar video',
    exitTrim: 'Salir de recorte',
    audioSilentWarningMessage: 'Parece que no llega ningún audio. Intenta hablar más fuerte y, si este mensaje no desaparece, recarga el navegador.',
    processingVideoTooltip: 'El video se está procesando, por favor espere un momento',
    prompterCountdown: 'Cuenta atrás',
    prompterCountdownMinutes: 'Min',
    prompterCountdownSeconds: 'Seg',
    prompterCountdownSet: 'Establecer',
    prompterCountdownStart: 'Iniciar',
    prompterCountdownPause: 'Pausar',
    prompterCountdownReset: 'Reiniciar',
    prompterCountdownEditDuration: 'Cambiar duración',
  },
  ja: {
    defaultScript:
      'ここにスクリプトを書きます。\n\n' +
      'T: テキストを編集\n' +
      'R: 録画/録画停止\n' +
      'D: 動画を表示してダウンロード\n' +
      'スペース: 再生/一時停止\n' +
      'C: プロンプター操作\n' +
      'P: テレプロンプターをポップアウト/イン\n' +
      'Y: 上部に固定/解除\n' +
      'H: プロンプター表示/非表示\n' +
      'I: 入力設定\n' +
      'M: Markdown を有効化\n' +
      'V: 自動スクロール\n' +
      'F: 全画面表示',
    language: '言語',
    script: 'スクリプト',
    enableMarkdown: 'Markdown を有効化',
    close: '閉じる',
    saveScript: '保存',
    scriptSaved: '保存しました',
    deleteSavedScript: '保存済みスクリプトを削除',
    savedScripts: '保存したスクリプト',
    noSavedScripts: '保存されたスクリプトはまだありません。',
    savedScriptsInfo: 'このブラウザにローカル保存されます。',
    replaceCurrentScript: '現在のスクリプトを置き換える',
    backToScript: 'スクリプトに戻る',
    backToSavedScripts: '一覧に戻る',
    savedAt: '保存日時',
    savedScriptPreview: '保存スクリプト',
    emptySavedScript: '（空のスクリプト）',
    hidePrompter: 'プロンプターを隠す',
    showPrompter: 'プロンプターを表示',
    controls: 'コントロール',
    drag: 'ドラッグ',
    mirrorText: 'テキストを反転',
    alignLeft: '左',
    alignCenter: '中央',
    alignRight: '右',
    mirrorVideo: '映像を反転',
    speed: '速度',
    textSize: '文字サイズ',
    opacity: '不透明度',
    text: 'テキストを編集',
    camera: 'カメラ',
    mic: 'マイク',
    inputs: '入力',
    videos: '動画',
    download: 'ダウンロード',
    record: '録画',
    stopRecording: '録画停止',
    startRecording: '録画開始',
    playPrompter: 'プロンプター再生',
    pausePrompter: 'プロンプター停止',
    playVideo: '動画再生',
    pauseVideo: '動画停止',
    inputsTitle: '入力',
    videosTitle: '動画',
    noCameras: 'カメラなし',
    noMics: 'マイクなし',
    on: 'オン',
    off: 'オフ',
    recordFirstVideo: '最初の動画を録画してダウンロードしてください。',
    takeLabel: (index) => `テイク ${index}`,
    downloadTakeLabel: (index) => `テイク ${index} をダウンロード`,
    deleteTakeLabel: (index) => `テイク ${index} を削除`,
    storageTooltip: '録画に使用されているブラウザのストレージです。90%を超えると録画できません。動画を削除してスペースを確保してください。',
    memoryWarningTitle: 'ビデオはローカルに保存されています',
    memoryWarningMessage: '多くの録画は大量のメモリを使用する可能性があります。不要な録画をダウンロードして削除してください。',
    browserWarningTitle: 'ブラウザ互換性',
    browserWarningMessage: 'telemeは互換性の制限により、Chromeで最もよく動作します。他のブラウザで使用する場合、既知のバグがあります。',
    continue: '続ける',
    confirm: '確認',
    clearAll: 'すべて削除',
    deleteAllConfirm: 'すべて削除しますか？',
    confirmQuestion: '確認？',
    inputsTooltip: '入力',
    aboutMessage: 'telemeはオープンソースのテレプロンプターです - 100%無料、ログイン不要、ブラウザベース。開発者: ',
    fullscreen: 'フルスクリーン',
    enterFullscreen: 'フルスクリーンにする',
    exitFullscreen: 'フルスクリーンを終了',
    fixToTop: '上部に固定',
    unfixFromTop: '上部から解除',
    persistVideos: 'ビデオをローカルに保存',
    persistVideosTooltip: 'デフォルトではビデオはローカルメモリに保存され、一度に保存できるビデオは10本に制限されています。一時的な保存を有効にするには非表示にし、ウェブ网站を更新する前にすべての録画済みビデオをダウンロードしてください。',
    persistVideosWillSave10: '最新の10本のビデオをローカルに保存します。有効にするとリロード後も保持されます。',
    maxVideosReached: 'ローカルに保存できるビデオは最大10本です。ビデオを削除するか、永続ストレージを無効にして録画を続けてください。',
    deleteKey: 'delete',
    popOutPrompter: '別ウィンドウ',
    popInPrompter: '元に戻す',
    pipEditHint: 'テキストを編集するには、ウェブサイトに戻ってテキストエディタパネル (T) を開いてください。',
    popOutOnlyChrome: 'Safariではポップアウトモードは利用できません。互換性を高めるためにChromeを使用してください。',
    allowCameraAccess: 'カメラへのアクセスを許可',
    braveBlockedMessage: 'Braveがカメラへのアクセスをブロックしました。アドレスバーのShieldsアイコンまたは鍵アイコンをクリックして権限をリセットし、このサイトのフィンガープリント保護を無効にしてください。互換性を高めるためにChromeを使用してください。',
    autoScroll: '自動スクロール',
    autoScrolling: '自動スクロール中',
    autoScrollStartPlaying: '再生すると自動スクロール',
    autoScrollSpeed: '自動スクロール速度',
    autoScrollSpeedTooltip: '自動スクロール時の単語毎分数',
    shortcutsMenu:
      'T: テキストを編集\n' +
      'R: 録画/録画停止\n' +
      'D: 動画を表示してダウンロード\n' +
      'スペース: 再生/一時停止\n' +
      'C: プロンプター操作\n' +
      'P: テレプロンプターをポップアウト/イン\n' +
      'Y: 上部に固定/解除\n' +
      'H: プロンプター表示/非表示\n' +
      'I: 入力設定\n' +
      'M: Markdown を有効化\n' +
      'V: 自動スクロール\n' +
      'F: 全画面表示',
    shortcutsTitle: 'ショートカット',
    speakingTime: '発話時間',
    trimVideo: 'ビデオをトリミング',
    exitTrim: 'トリミング終了',
    audioSilentWarningMessage: 'オーディオが入力されていないようです。もう少し大きな声で話してみてください。このメッセージが消えない場合は、ブラウザを再読み込みしてください。',
    processingVideoTooltip: '動画を処理中です。少々お待ちください',
    prompterCountdown: 'テイク用タイマー',
    prompterCountdownMinutes: '分',
    prompterCountdownSeconds: '秒',
    prompterCountdownSet: '設定',
    prompterCountdownStart: '開始',
    prompterCountdownPause: '一時停止',
    prompterCountdownReset: 'リセット',
    prompterCountdownEditDuration: '時間を変更',
  },
  hi: {
    defaultScript:
      'आपकी स्क्रिप्ट यहाँ जाती है।\n\n' +
      'T: टेक्स्ट संपादित करें\n' +
      'R: रिकॉर्ड/रिकॉर्डिंग बंद करें\n' +
      'D: वीडियो दिखाएँ और डाउनलोड करें\n' +
      'स्पेस: चलाएँ/रोकें\n' +
      'C: टेलीप्रॉम्प्टर नियंत्रण\n' +
      'P: टेलीप्रॉम्प्टर पॉप आउट/इन\n' +
      'Y: ऊपर से फिक्स/अनफिक्स करें\n' +
      'H: टेलीप्रॉम्प्टर दिखाएँ/छिपाएँ\n' +
      'I: इनपुट नियंत्रित करें\n' +
      'M: Markdown सक्षम करें\n' +
      'V: स्वचालित स्क्रॉलिंग\n' +
      'F: फ़ुलस्क्रीन',
    language: 'भाषा',
    script: 'स्क्रिप्ट',
    enableMarkdown: 'Markdown सक्षम करें',
    close: 'बंद करें',
    saveScript: 'सहेजें',
    scriptSaved: 'सहेजा गया',
    deleteSavedScript: 'सहेजा स्क्रिप्ट हटाएँ',
    savedScripts: 'सहेजे गए स्क्रिप्ट्स',
    noSavedScripts: 'अभी कोई स्क्रिप्ट सहेजी नहीं गई है।',
    savedScriptsInfo: 'इस ब्राउज़र में स्थानीय रूप से सहेजा गया।',
    replaceCurrentScript: 'वर्तमान स्क्रिप्ट बदलें',
    backToScript: 'स्क्रिप्ट पर वापस',
    backToSavedScripts: 'सूची पर वापस',
    savedAt: 'सहेजने का समय',
    savedScriptPreview: 'सहेजा गया स्क्रिप्ट',
    emptySavedScript: '(रिक्त स्क्रिप्ट)',
    hidePrompter: 'टेलीप्रॉम्प्टर छिपाएँ',
    showPrompter: 'टेलीप्रॉम्प्टर दिखाएँ',
    controls: 'कंट्रोल्स',
    drag: 'खींचें',
    mirrorText: 'टेक्स्ट मिरर',
    alignLeft: 'बाएं',
    alignCenter: 'केंद्र',
    alignRight: 'दाएं',
    mirrorVideo: 'वीडियो मिरर',
    speed: 'गति',
    textSize: 'टेक्स्ट आकार',
    opacity: 'अपारदर्शिता',
    text: 'टेक्स्ट संपादित करें',
    camera: 'कैमरा',
    mic: 'माइक',
    inputs: 'इनपुट',
    videos: 'वीडियो',
    download: 'डाउनलोड',
    record: 'रिकॉर्ड',
    stopRecording: 'रिकॉर्डिंग बंद करें',
    startRecording: 'रिकॉर्डिंग शुरू करें',
    playPrompter: 'टेलीप्रॉम्प्टर चलाएँ',
    pausePrompter: 'टेलीप्रॉम्प्टर रोकें',
    playVideo: 'वीडियो चलाएँ',
    pauseVideo: 'वीडियो रोकें',
    inputsTitle: 'इनपुट',
    videosTitle: 'वीडियो',
    noCameras: 'कोई कैमरा नहीं',
    noMics: 'कोई माइक्रोफ़ोन नहीं',
    on: 'चालू',
    off: 'बंद',
    recordFirstVideo: 'डाउनलोड करने के लिए अपना पहला वीडियो रिकॉर्ड करें।',
    takeLabel: (index) => `टेक ${index}`,
    downloadTakeLabel: (index) => `टेक ${index} डाउनलोड करें`,
    deleteTakeLabel: (index) => `टेक ${index} हटाएं`,
    storageTooltip: 'आपकी रिकॉर्डिंग द्वारा उपयोग किया गया ब्राउज़र स्टोरेज। 90% से अधिक होने पर रिकॉर्ड नहीं कर सकते। स्थान खाली करने के लिए वीडियो हटाएं।',
    memoryWarningTitle: 'वीडियो स्थानीय रूप से संग्रहीत हैं',
    memoryWarningMessage: 'कई रिकॉर्डिंग महत्वपूर्ण मेमोरी का उपयोग कर सकते हैं। जिन रिकॉर्डिंग की आवश्यकता नहीं है उन्हें डाउनलोड और हटाएं।',
    browserWarningTitle: 'ब्राउज़र अनुकूलता',
    browserWarningMessage: 'teleme अनुकूलता सीमाओं के कारण Chrome में सबसे अच्छा काम करता है। विभिन्न ब्राउज़रों में उपयोग करने पर ज्ञात बग हैं।',
    continue: 'जारी रखें',
    confirm: 'पुष्टि करें',
    clearAll: 'सभी साफ़ करें',
    deleteAllConfirm: 'सभी हटाएं?',
    confirmQuestion: 'पुष्टि करें?',
    inputsTooltip: 'इनपुट',
    aboutMessage: 'teleme एक ओपन-सोर्स टेलीप्रॉम्प्टर है - 100% मुफ्त, लॉगिन की आवश्यकता नहीं, और ब्राउज़र आधारित। इसे विकसित किया गया है ',
    fullscreen: 'पूर्ण स्क्रीन',
    enterFullscreen: 'पूर्ण स्क्रीन में प्रवेश करें',
    exitFullscreen: 'पूर्ण स्क्रीन से बाहर निकलें',
    fixToTop: 'शीर्ष पर फिक्स करें',
    unfixFromTop: 'शीर्ष से अनफिक्स करें',
    persistVideos: 'वीडियो स्थानीय रूप से सहेजें',
    persistVideosTooltip: 'डिफ़ॉल्ट रूप से वीडियो स्थानीय मेमोरी में सहेजे जाते हैं और एक बार में 10 वीडियो तक सीमित होते हैं। अस्थायी संग्रहण सक्षम करने के लिए अक्षम करें और वेबसाइट को रीफ़्रेश करने से पहले सभी रिकॉर्ड किए गए वीडियो डाउनलोड करें।',
    persistVideosWillSave10: 'नवीनतम 10 वीडियो स्थानीय रूप से सहेजे जाएंगे। रीलोड के बाद उन्हें रखने के लिए सक्षम करें।',
    maxVideosReached: 'अधिकतम 10 वीडियो स्थानीय रूप से सहेजे जा सकते हैं। कुछ वीडियो हटाएं या अधिक रिकॉर्ड करने के लिए स्थायी संग्रहण अक्षम करें।',
    deleteKey: 'delete',
    popOutPrompter: 'बाहर निकालें',
    popInPrompter: 'वापस लाएं',
    pipEditHint: 'टेक्स्ट को एडिट करने के लिए, वेबसाइट पर वापस जाएं और टेक्स्ट एडिटर पैनल (T) खोलें।',
    popOutOnlyChrome: 'Safari पर पॉप आउट मोड संभव नहीं है। बेहतर अनुकूलता के लिए Chrome का उपयोग करें।',
    allowCameraAccess: 'कैमरा एक्सेस की अनुमति दें',
    braveBlockedMessage: 'Brave ने कैमरा एक्सेस को ब्लॉक कर दिया है। अनुमतियों को रीसेट करने और इस साइट के लिए फ़िंगरप्रिंटिंग सुरक्षा को अक्षम करने के लिए एड्रेस बार में शील्ड्स आइकन या लॉक आइकन पर क्लिक करें। बेहतर अनुकूलता के लिए Chrome का उपयोग करें।',
    autoScroll: 'स्वचालित स्क्रॉल',
    autoScrolling: 'स्वचालित स्क्रॉल हो रहा है',
    autoScrollStartPlaying: 'स्वचालित स्क्रॉल के लिए चलाएं',
    autoScrollSpeed: 'स्वचालित स्क्रॉल गति',
    autoScrollSpeedTooltip: 'स्वचालित स्क्रॉलिंग के दौरान शब्द प्रति मिनट',
    shortcutsMenu:
      'T: टेक्स्ट संपादित करें\n' +
      'R: रिकॉर्ड/रिकॉर्डिंग बंद करें\n' +
      'D: वीडियो दिखाएँ और डाउनलोड करें\n' +
      'स्पेस: चलाएँ/रोकें\n' +
      'C: टेलीप्रॉम्प्टर नियंत्रण\n' +
      'P: टेलीप्रॉम्प्टर पॉप आउट/इन\n' +
      'Y: ऊपर से फिक्स/अनफिक्स करें\n' +
      'H: टेलीप्रॉम्प्टर दिखाएँ/छिपाएँ\n' +
      'I: इनपुट नियंत्रित करें\n' +
      'M: Markdown सक्षम करें\n' +
      'V: स्वचालित स्क्रॉलिंग\n' +
      'F: फ़ुलस्क्रीन',
    shortcutsTitle: 'शॉर्टकट',
    speakingTime: 'बोलने का समय',
    trimVideo: 'वीडियो ट्रिम करें',
    exitTrim: 'ट्रिम से बाहर निकलें',
    audioSilentWarningMessage: 'लगता है कोई ऑडियो नहीं आ रहा है। ज़ोर से बोलने की कोशिश करें, और अगर यह संदेश नहीं जाता, तो ब्राउज़र रीलोड करें।',
    processingVideoTooltip: 'वीडियो प्रसंस्करण हो रहा है, कृपया एक क्षण प्रतीक्षा करें',
    prompterCountdown: 'टेक काउंटडाउन',
    prompterCountdownMinutes: 'मिन',
    prompterCountdownSeconds: 'से',
    prompterCountdownSet: 'सेट करें',
    prompterCountdownStart: 'शुरू',
    prompterCountdownPause: 'रोकें',
    prompterCountdownReset: 'रीसेट',
    prompterCountdownEditDuration: 'अवधि बदलें',
  },
  fr: {
    defaultScript:
      'Votre script va ici.\n\n' +
      'T : éditer le texte du prompteur\n' +
      'R : enregistrer/arrêter l\'enregistrement\n' +
      'D : afficher et télécharger les vidéos\n' +
      'Espace : lecture/pause\n' +
      'C : contrôles du prompteur\n' +
      'P : sortir/rentrer le prompteur\n' +
      'Y : fixer/détacher du haut\n' +
      'H : afficher/masquer le prompter\n' +
      'I : contrôler les entrées\n' +
      'M : activer Markdown\n' +
      'V : Suivre la Voix\n' +
      'F : plein écran',
    language: 'Langue',
    script: 'Script',
    enableMarkdown: 'Activer Markdown',
    close: 'Fermer',
    saveScript: 'Enregistrer',
    scriptSaved: 'Enregistré',
    deleteSavedScript: 'Supprimer le script enregistré',
    savedScripts: 'Scripts enregistrés',
    noSavedScripts: 'Aucun script enregistré pour le moment.',
    savedScriptsInfo: 'Enregistrés localement dans ce navigateur.',
    replaceCurrentScript: 'Remplacer le script actuel',
    backToScript: 'Retour au script',
    backToSavedScripts: 'Retour à la liste',
    savedAt: 'Enregistré',
    savedScriptPreview: 'Script enregistré',
    emptySavedScript: '(Script vide)',
    hidePrompter: 'Masquer le prompter',
    showPrompter: 'Afficher le prompter',
    controls: 'Contrôles',
    drag: 'Glisser',
    mirrorText: 'Miroir du texte',
    alignLeft: 'Gauche',
    alignCenter: 'Centre',
    alignRight: 'Droite',
    mirrorVideo: 'Miroir vidéo',
    speed: 'Vitesse',
    textSize: 'Taille du texte',
    opacity: 'Opacité',
    text: 'Modifier le texte',
    camera: 'Caméra',
    mic: 'Micro',
    inputs: 'Entrées',
    videos: 'Vidéos',
    download: 'Télécharger',
    record: 'Enregistrer',
    stopRecording: 'Arrêter l’enregistrement',
    startRecording: 'Démarrer l’enregistrement',
    playPrompter: 'Lire le prompter',
    pausePrompter: 'Mettre en pause',
    playVideo: 'Lire la vidéo',
    pauseVideo: 'Mettre en pause',
    inputsTitle: 'Entrées',
    videosTitle: 'Vidéos',
    noCameras: 'Aucune caméra',
    noMics: 'Aucun micro',
    on: 'Activé',
    off: 'Désactivé',
    recordFirstVideo: 'Enregistrez votre première vidéo pour la télécharger.',
    takeLabel: (index) => `Prise ${index}`,
    downloadTakeLabel: (index) => `Télécharger la prise ${index}`,
    deleteTakeLabel: (index) => `Supprimer la prise ${index}`,
    storageTooltip: "Stockage du navigateur utilisé par vos enregistrements. Vous ne pouvez pas enregistrer au-delà de 90%. Supprimez des vidéos pour libérer de l'espace.",
    memoryWarningTitle: 'Les vidéos sont stockées localement',
    memoryWarningMessage: "De nombreux enregistrements peuvent utiliser beaucoup de mémoire. Téléchargez et supprimez les enregistrements dont vous n'avez pas besoin.",
    browserWarningTitle: 'Compatibilité du navigateur',
    browserWarningMessage: "teleme fonctionne mieux dans Chrome en raison de limitations de compatibilité. Il existe des bugs connus lors de l'utilisation dans d'autres navigateurs.",
    continue: 'Continuer',
    confirm: 'Confirmer',
    clearAll: 'Tout effacer',
    deleteAllConfirm: 'Tout supprimer ?',
    confirmQuestion: 'Confirmer ?',
    inputsTooltip: 'Entrées',
    aboutMessage: 'teleme est un téléprompteur open-source - 100% gratuit, pas de connexion requise et basé sur navigateur. Il a été développé par ',
    fullscreen: 'Plein écran',
    enterFullscreen: 'Entrer en plein écran',
    exitFullscreen: 'Quitter le plein écran',
    fixToTop: 'Fixer en haut',
    unfixFromTop: 'Défixer du haut',
    persistVideos: 'Enregistrer les vidéos localement',
    persistVideosTooltip: 'Par défaut, les vidéos sont enregistrées dans la mémoire locale et limitées à 10 vidéos enregistrées à la fois. Désactivez cette option pour activer le stockage temporaire et téléchargez toutes les vidéos enregistrées avant d\'actualiser le site web.',
    persistVideosWillSave10: 'Enregistrera les 10 vidéos les plus récentes localement. Activez pour les conserver entre les rechargements.',
    maxVideosReached: 'Maximum de 10 vidéos peuvent être enregistrées localement. Supprimez des vidéos ou désactivez le stockage persistant pour enregistrer davantage.',
    deleteKey: 'delete',
    popOutPrompter: 'Détacher',
    popInPrompter: 'Attacher',
    pipEditHint: "Pour modifier le texte, retournez sur le site web et ouvrez le panneau de l'éditeur de texte (T).",
    popOutOnlyChrome: 'Le mode fenêtre surgissante n’est pas possible sur Safari. Utilisez Chrome pour une meilleure compatibilité.',
    allowCameraAccess: "Autoriser l'accès à la caméra",
    braveBlockedMessage: "Brave a bloqué l'accès à la caméra. Cliquez sur l'icône Shields ou sur l'icône du cadenas dans la barre d'adresse pour réinitialiser les permissions et désactiver la protection contre le fingerprinting pour ce site. Utilisez Chrome pour une meilleure compatibilité.",
    autoScroll: 'Défilement automatique',
    autoScrolling: 'Défilement en cours',
    autoScrollStartPlaying: 'Lancez la lecture pour défiler automatiquement',
    autoScrollSpeed: 'Vitesse de défilement automatique',
    autoScrollSpeedTooltip: 'Mots par minute en défilement automatique',
    shortcutsMenu:
      'T : éditer le texte du prompteur\n' +
      'R : enregistrer/arrêter l\'enregistrement\n' +
      'D : afficher et télécharger les vidéos\n' +
      'Espace : lecture/pause\n' +
      'C : contrôles du prompteur\n' +
      'P : sortir/rentrer le prompteur\n' +
      'Y : fixer/détacher du haut\n' +
      'H : afficher/masquer le prompter\n' +
      'I : contrôler les entrées\n' +
      'M : activer Markdown\n' +
      'V : suivre la voix\n' +
      'F : plein écran',
    shortcutsTitle: 'Raccourcis',
    speakingTime: 'Temps de parole',
    trimVideo: 'Rogner la vidéo',
    exitTrim: 'Quitter rogner',
    audioSilentWarningMessage: "Il semble qu'aucun audio ne passe. Essayez de parler plus fort, et si ce message ne disparaît pas, rechargez votre navigateur.",
    processingVideoTooltip: 'La vidéo est en cours de traitement, veuillez patienter un instant',
    prompterCountdown: 'Compte à rebours',
    prompterCountdownMinutes: 'Min',
    prompterCountdownSeconds: 'Sec',
    prompterCountdownSet: 'Définir',
    prompterCountdownStart: 'Démarrer',
    prompterCountdownPause: 'Pause',
    prompterCountdownReset: 'Réinitialiser',
    prompterCountdownEditDuration: 'Modifier la durée',
  },
  de: {
    defaultScript:
      'Ihr Skript kommt hierher.\n\n' +
      'T: Text bearbeiten\n' +
      'R: aufnehmen/Aufnahme stoppen\n' +
      'D: Videos anzeigen und herunterladen\n' +
      'Leertaste: abspielen/pausieren\n' +
      'C: Teleprompter-Steuerung\n' +
      'P: Teleprompter ausklappen/einklappen\n' +
      'Y: Fixierung oben ein/aus\n' +
      'H: Teleprompter ein-/ausblenden\n' +
      'I: Eingänge steuern\n' +
      'M: Markdown aktivieren\n' +
      'V: Stimme Folgen\n' +
      'F: Vollbild',
    language: 'Sprache',
    script: 'Skript',
    enableMarkdown: 'Markdown aktivieren',
    close: 'Schließen',
    saveScript: 'Speichern',
    scriptSaved: 'Gespeichert',
    deleteSavedScript: 'Gespeichertes Skript löschen',
    savedScripts: 'Gespeicherte Skripte',
    noSavedScripts: 'Noch keine Skripte gespeichert.',
    savedScriptsInfo: 'Lokal in diesem Browser gespeichert.',
    replaceCurrentScript: 'Aktuelles Skript ersetzen',
    backToScript: 'Zurück zum Skript',
    backToSavedScripts: 'Zurück zur Liste',
    savedAt: 'Gespeichert',
    savedScriptPreview: 'Gespeichertes Skript',
    emptySavedScript: '(Leeres Skript)',
    hidePrompter: 'Teleprompter ausblenden',
    showPrompter: 'Teleprompter anzeigen',
    controls: 'Steuerung',
    drag: 'Ziehen',
    mirrorText: 'Text spiegeln',
    alignLeft: 'Links',
    alignCenter: 'Mitte',
    alignRight: 'Rechts',
    mirrorVideo: 'Video spiegeln',
    speed: 'Geschwindigkeit',
    textSize: 'Textgröße',
    opacity: 'Deckkraft',
    text: 'Text bearbeiten',
    camera: 'Kamera',
    mic: 'Mikro',
    inputs: 'Eingänge',
    videos: 'Videos',
    download: 'Herunterladen',
    record: 'Aufnehmen',
    stopRecording: 'Aufnahme stoppen',
    startRecording: 'Aufnahme starten',
    playPrompter: 'Teleprompter abspielen',
    pausePrompter: 'Teleprompter pausieren',
    playVideo: 'Video abspielen',
    pauseVideo: 'Video pausieren',
    inputsTitle: 'Eingänge',
    videosTitle: 'Videos',
    noCameras: 'Keine Kameras',
    noMics: 'Keine Mikrofone',
    on: 'An',
    off: 'Aus',
    recordFirstVideo: 'Nehmen Sie Ihr erstes Video auf, um es herunterzuladen.',
    takeLabel: (index) => `Take ${index}`,
    downloadTakeLabel: (index) => `Take ${index} herunterladen`,
    deleteTakeLabel: (index) => `Take ${index} löschen`,
    storageTooltip: 'Vom Browser verwendeter Speicher für deine Aufnahmen. Über 90% ist keine Aufnahme möglich. Lösche Videos, um Speicher freizugeben.',
    memoryWarningTitle: 'Videos sind lokal gespeichert',
    memoryWarningMessage: 'Viele Aufnahmen können viel Speicher verwenden. Laden Sie Aufnahmen herunter und löschen Sie die, die Sie nicht benötigen.',
    browserWarningTitle: 'Browser-Kompatibilität',
    browserWarningMessage: 'teleme funktioniert aufgrund von Kompatibilitätseinschränkungen am besten in Chrome. Es gibt bekannte Fehler bei der Verwendung in anderen Browsern.',
    continue: 'Fortfahren',
    confirm: 'Bestätigen',
    clearAll: 'Alle löschen',
    deleteAllConfirm: 'Alle löschen?',
    confirmQuestion: 'Bestätigen?',
    inputsTooltip: 'Eingänge',
    aboutMessage: 'teleme ist ein Open-Source-Teleprompter - 100% kostenlos, keine Anmeldung erforderlich und browserbasiert. Entwickelt von ',
    fullscreen: 'Vollbild',
    enterFullscreen: 'Vollbild aktivieren',
    exitFullscreen: 'Vollbild beenden',
    fixToTop: 'Oben fixieren',
    unfixFromTop: 'Von oben lösen',
    persistVideos: 'Videos lokal speichern',
    persistVideosTooltip: 'Standardmäßig werden Videos im lokalen Speicher gespeichert und sind auf jeweils 10 gespeicherte Videos begrenzt. Deaktivieren Sie dies, um die temporäre Speicherung zu aktivieren, und laden Sie alle aufgenommenen Videos herunter, bevor Sie die Website aktualisieren.',
    persistVideosWillSave10: 'Speichert die 10 neuesten Videos lokal. Aktivieren, um sie über Neuladungen hinweg zu behalten.',
    maxVideosReached: 'Maximal 10 Videos können lokal gespeichert werden. Löschen Sie einige Videos oder deaktivieren Sie den persistenten Speicher, um mehr aufzunehmen.',
    deleteKey: 'delete',
    popOutPrompter: 'Auslagern',
    popInPrompter: 'Einlagern',
    pipEditHint: 'Um den SKript zu bearbeiten, gehen Sie zurück zur Website und öffnen Sie das Texteditor-Panel (T).',
    popOutOnlyChrome: 'Der Pop-out-Modus ist in Safari nicht möglich. Verwenden Sie Chrome für eine bessere Kompatibilität.',
    allowCameraAccess: 'Kamerazugriff erlauben',
    braveBlockedMessage: 'Brave hat den Kamerazugriff blockiert. Klicken Sie auf das Shields-Symbol oder das Schloss-Symbol in der Adressleiste, um die Berechtigungen zurückzusetzen und den Fingerprinting-Schutz für diese Website zu deaktivieren. Verwenden Sie Chrome für eine bessere Kompatibilität.',
    autoScroll: 'Automatisches Scrollen',
    autoScrolling: 'Wird automatisch gescrollt',
    autoScrollStartPlaying: 'Wiedergabe starten für automatisches Scrollen',
    autoScrollSpeed: 'Geschwindigkeit des automatischen Scrollens',
    autoScrollSpeedTooltip: 'Wörter pro Minute beim automatischen Scrollen',
    shortcutsMenu:
      'T: Text bearbeiten\n' +
      'R: aufnehmen/Aufnahme stoppen\n' +
      'D: Videos anzeigen und herunterladen\n' +
      'Leertaste: abspielen/pausieren\n' +
      'C: Teleprompter-Steuerung\n' +
      'P: Teleprompter ausklappen/einklappen\n' +
      'Y: Fixierung oben ein/aus\n' +
      'H: Teleprompter ein-/ausblenden\n' +
      'I: Eingänge steuern\n' +
      'M: Markdown aktivieren\n' +
      'V: Stimme folgen\n' +
      'F: Vollbild',
    shortcutsTitle: 'Tastenkombinationen',
    speakingTime: 'Sprechzeit',
    trimVideo: 'Video trimmen',
    exitTrim: 'Trimmen beenden',
    audioSilentWarningMessage: 'Es scheint kein Audio durchzukommen. Sprechen Sie bitte lauter, und wenn diese Meldung nicht verschwindet, laden Sie Ihren Browser neu.',
    processingVideoTooltip: 'Das Video wird verarbeitet, bitte warten Sie einen Moment',
    prompterCountdown: 'Aufnahme-Timer',
    prompterCountdownMinutes: 'Min',
    prompterCountdownSeconds: 'Sek',
    prompterCountdownSet: 'Speichern',
    prompterCountdownStart: 'Start',
    prompterCountdownPause: 'Pause',
    prompterCountdownReset: 'Zurücksetzen',
    prompterCountdownEditDuration: 'Dauer ändern',
  },
  zh: {
    defaultScript:
      '你的脚本写在这里。\n\n' +
      'T：编辑文本\n' +
      'R：录制/停止录制\n' +
      'D：显示并下载视频\n' +
      '空格：播放/暂停\n' +
      'C：提示器控制\n' +
      'P：弹出/弹入提词器\n' +
      'Y：固定/取消固定至顶部\n' +
      'H：隐藏/显示提示器\n' +
      'I：控制输入\n' +
      'M：启用 Markdown\n' +
      'V：自动滚动\n' +
      'F：全屏',
    language: '语言',
    script: '脚本',
    enableMarkdown: '启用 Markdown',
    close: '关闭',
    saveScript: '保存',
    scriptSaved: '已保存',
    deleteSavedScript: '删除已保存脚本',
    savedScripts: '已保存的脚本',
    noSavedScripts: '还没有已保存的脚本。',
    savedScriptsInfo: '在此浏览器中本地保存。',
    replaceCurrentScript: '替换当前脚本',
    backToScript: '返回脚本',
    backToSavedScripts: '返回列表',
    savedAt: '已保存',
    savedScriptPreview: '已保存脚本',
    emptySavedScript: '（空脚本）',
    hidePrompter: '隐藏提示器',
    showPrompter: '显示提示器',
    controls: '控制',
    drag: '拖动',
    mirrorText: '镜像文本',
    alignLeft: '左',
    alignCenter: '居中',
    alignRight: '右',
    mirrorVideo: '镜像视频',
    speed: '速度',
    textSize: '文字大小',
    opacity: '不透明度',
    text: '编辑文本',
    camera: '摄像头',
    mic: '麦克风',
    inputs: '输入',
    videos: '视频',
    download: '下载',
    record: '录制',
    stopRecording: '停止录制',
    startRecording: '开始录制',
    playPrompter: '播放提示器',
    pausePrompter: '暂停提示器',
    playVideo: '播放视频',
    pauseVideo: '暂停视频',
    inputsTitle: '输入',
    videosTitle: '视频',
    noCameras: '没有摄像头',
    noMics: '没有麦克风',
    on: '开',
    off: '关',
    recordFirstVideo: '录制你的第一个视频以便下载。',
    takeLabel: (index) => `拍摄 ${index}`,
    downloadTakeLabel: (index) => `下载拍摄 ${index}`,
    deleteTakeLabel: (index) => `删除拍摄 ${index}`,
    storageTooltip: '浏览器存储已被您的录制占用。超过 90% 将无法录制。删除视频以释放空间。',
    memoryWarningTitle: '视频存储在本地',
    memoryWarningMessage: '大量录制可能会占用大量内存。下载并删除不需要的录制。',
    browserWarningTitle: '浏览器兼容性',
    browserWarningMessage: '由于兼容性限制，teleme在Chrome中效果最佳。在其他浏览器中使用时存在已知错误。',
    continue: '继续',
    confirm: '确认',
    clearAll: '全部清除',
    deleteAllConfirm: '全部删除？',
    confirmQuestion: '确认？',
    inputsTooltip: '输入',
    aboutMessage: 'teleme是一个开源提词器 - 100%免费，无需登录，基于浏览器。开发者: ',
    fullscreen: '全屏',
    enterFullscreen: '进入全屏',
    exitFullscreen: '退出全屏',
    fixToTop: '固定到顶部',
    unfixFromTop: '从顶部取消固定',
    persistVideos: '本地保存视频',
    persistVideosTooltip: '默认情况下视频保存在本地内存中，且每次最多只能保存10个视频。禁用以启用临时存储并请在刷新网站前下载所有录制的视频。',
    persistVideosWillSave10: '将在本地保存最近的10个视频。启用以在重新加载后保留它们。',
    maxVideosReached: '最多可以在本地保存10个视频。删除一些视频或禁用持久存储以录制更多。',
    deleteKey: 'delete',
    popOutPrompter: '弹出',
    popInPrompter: '收回',
    pipEditHint: '要编辑文本，请返回网站并打开文本编辑器面板 (T)。',
    popOutOnlyChrome: 'Safari 上不支持弹出模式。为了获得更好的兼容性，请使用 Chrome。',
    allowCameraAccess: '允许访问摄像头',
    braveBlockedMessage: 'Brave 已阻止访问摄像头。点击地址栏中的 Shields 图标或锁形图标以重置权限，并禁用此网站的指纹识别保护。为了获得更好的兼容性，请使用 Chrome。',
    autoScroll: '自动滚动',
    autoScrolling: '正在自动滚动',
    autoScrollStartPlaying: '开始播放以自动滚动',
    autoScrollSpeed: '自动滚动速度',
    autoScrollSpeedTooltip: '自动滚动时的每分钟字数',
    shortcutsMenu:
      'T：编辑文本\n' +
      'R：录制/停止录制\n' +
      'D：显示并下载视频\n' +
      '空格：播放/暂停\n' +
      'C：提示器控制\n' +
      'P：弹出/弹入提词器\n' +
      'Y：固定/取消固定至顶部\n' +
      'H：隐藏/显示提示器\n' +
      'I：控制输入\n' +
      'M：启用 Markdown\n' +
      'V：自动滚动\n' +
      'F：全屏',
    shortcutsTitle: '快捷键',
    speakingTime: '演讲时间',
    trimVideo: '修剪视频',
    exitTrim: '退出修剪',
    audioSilentWarningMessage: '似乎没有音频传入。请尝试大声说话，如果此提示仍未消失，请重新加载浏览器。',
    processingVideoTooltip: '视频正在处理中，请稍候',
    prompterCountdown: '拍摄倒计时',
    prompterCountdownMinutes: '分',
    prompterCountdownSeconds: '秒',
    prompterCountdownSet: '设置时长',
    prompterCountdownStart: '开始',
    prompterCountdownPause: '暂停',
    prompterCountdownReset: '重置',
    prompterCountdownEditDuration: '修改时长',
  },
  ar: {
    defaultScript:
      'ضع النص هنا.\n\n' +
      'T: تعديل النص\n' +
      'R: تسجيل/إيقاف التسجيل\n' +
      'D: عرض وتنزيل الفيديوهات\n' +
      'مسافة: تشغيل/إيقاف\n' +
      'C: عناصر التحكم بالتلقين\n' +
      'P: نافذة تلقين منبثقة/مضمنة\n' +
      'Y: تثبيت/إلغاء التثبيت بالأعلى\n' +
      'H: إظهار/إخفاء التلقين\n' +
      'I: التحكم بالمدخلات\n' +
      'M: تمكين Markdown\n' +
      'V: التمرير التلقائي\n' +
      'F: ملء الشاشة',
    language: 'اللغة',
    script: 'النص',
    enableMarkdown: 'تمكين Markdown',
    close: 'إغلاق',
    saveScript: 'حفظ',
    scriptSaved: 'تم الحفظ',
    deleteSavedScript: 'حذف النص المحفوظ',
    savedScripts: 'النصوص المحفوظة',
    noSavedScripts: 'لا توجد نصوص محفوظة بعد.',
    savedScriptsInfo: 'محفوظة محلياً في هذا المتصفح.',
    replaceCurrentScript: 'استبدال النص الحالي',
    backToScript: 'العودة إلى النص',
    backToSavedScripts: 'العودة إلى القائمة',
    savedAt: 'تم الحفظ',
    savedScriptPreview: 'نص محفوظ',
    emptySavedScript: '(نص فارغ)',
    hidePrompter: 'إخفاء الملقن',
    showPrompter: 'إظهار الملقن',
    controls: 'عناصر التحكم',
    drag: 'سحب',
    mirrorText: 'عكس النص',
    alignLeft: 'يسار',
    alignCenter: 'وسط',
    alignRight: 'يمين',
    mirrorVideo: 'عكس الفيديو',
    speed: 'السرعة',
    textSize: 'حجم النص',
    opacity: 'الشفافية',
    text: 'تعديل النص',
    camera: 'الكاميرا',
    mic: 'الميكروفون',
    inputs: 'المدخلات',
    videos: 'الفيديوهات',
    download: 'تنزيل',
    record: 'تسجيل',
    stopRecording: 'إيقاف التسجيل',
    startRecording: 'بدء التسجيل',
    playPrompter: 'تشغيل الملقن',
    pausePrompter: 'إيقاف مؤقت',
    playVideo: 'تشغيل الفيديو',
    pauseVideo: 'إيقاف الفيديو',
    inputsTitle: 'المدخلات',
    videosTitle: 'الفيديوهات',
    noCameras: 'لا توجد كاميرات',
    noMics: 'لا توجد ميكروفونات',
    on: 'تشغيل',
    off: 'إيقاف',
    recordFirstVideo: 'سجّل أول فيديو لتنزيله.',
    takeLabel: (index) => `لقطة ${index}`,
    downloadTakeLabel: (index) => `تنزيل اللقطة ${index}`,
    deleteTakeLabel: (index) => `حذف اللقطة ${index}`,
    storageTooltip: 'مساحة المتصفح المستخدمة بواسطة تسجيلاتك. لا يمكنك التسجيل بعد 90%. احذف مقاطع الفيديو لتحرير المساحة.',
    memoryWarningTitle: 'الفيديوهات مخزنة محلياً',
    memoryWarningMessage: 'التسجيلات الكثيرة قد تستخدم ذاكرة كبيرة. قم بتنزيل وحذف التسجيلات التي لا تحتاجها.',
    browserWarningTitle: 'توافق المتصفح',
    browserWarningMessage: 'يعمل teleme بشكل أفضل في Chrome بسبب قيود التوافق. توجد أخطاء معروفة عند الاستخدام في متصفحات مختلفة.',
    continue: 'متابعة',
    confirm: 'تأكيد',
    clearAll: 'مسح الكل',
    deleteAllConfirm: 'حذف الكل؟',
    confirmQuestion: 'تأكيد؟',
    inputsTooltip: 'المدخلات',
    aboutMessage: 'teleme هو ملقن مفتوح المصدر - مجاني 100%، لا يتطلب تسجيل الدخول، ويعمل على المتصفح. تم تطويره بواسطة ',
    fullscreen: 'ملء الشاشة',
    enterFullscreen: 'الدخول إلى ملء الشاشة',
    exitFullscreen: 'الخروج من ملء الشاشة',
    fixToTop: 'تثبيت في الأعلى',
    unfixFromTop: 'إلغاء التثبيت من الأعلى',
    persistVideos: 'حفظ الفيديوهات محلياً',
    persistVideosTooltip: 'بشكل افتراضي، يتم حفظ الفيديوهات في الذاكرة المحلية وتقتصر على 10 فيديوهات محفوظة في المرة الواحدة. قم بتعطيل هذا الخيار لتمكين التخزين المؤقت وتنزيل جميع الفيديوهات المسجلة قبل تحديث الموقع.',
    persistVideosWillSave10: 'سيحفظ أحدث 10 فيديوهات محلياً. قم بالتمكين للاحتفاظ بها عبر عمليات إعادة التحميل.',
    maxVideosReached: 'يمكن حفظ 10 فيديوهات كحد أقصى محلياً. احذف بعض الفيديوهات أو عطّل التخزين الدائم لتسجيل المزيد.',
    deleteKey: 'delete',
    popOutPrompter: 'نافذة منفصلة',
    popInPrompter: 'إعادة',
    pipEditHint: 'لتعديل النص، ارجع إلى الموقع وافتح لوحة محرر النصوص (T).',
    popOutOnlyChrome: 'وضع النافذة المنبثقة غير ممكن على Safari. استخدم Chrome لتوافق أفضل.',
    allowCameraAccess: 'السماح بالوصول إلى الكاميرا',
    braveBlockedMessage: 'حظر Brave الوصول إلى الكاميرا. انقر فوق أيقونة Shields أو أيقونة القفل في شريط العناوين لإعادة تعيين الأذونات وتعطيل حماية البصمة الرقمية لهذا الموقع. استخدم Chrome لتوافق أفضل.',
    autoScroll: 'التمرير التلقائي',
    autoScrolling: 'جاري التمرير التلقائي',
    autoScrollStartPlaying: 'ابدأ التشغيل للتمرير التلقائي',
    autoScrollSpeed: 'سرعة التمرير التلقائي',
    autoScrollSpeedTooltip: 'كلمات في الدقيقة أثناء التمرير التلقائي',
    shortcutsMenu:
      'مسافة: تشغيل/إيقاف\n' +
      'R: تسجيل/إيقاف التسجيل\n' +
      'D: عرض وتنزيل الفيديوهات\n' +
      'C: عناصر التحكم بالتلقين\n' +
      'H: إظهار/إخفاء التلقين\n' +
      'I: التحكم بالمدخلات\n' +
      'T: تعديل النص\n' +
      'M: تمكين Markdown\n' +
      'V: التمرير التلقائي\n' +
      'F: ملء الشاشة\n' +
      'Y: تثبيت/إلغاء التثبيت بالأعلى\n' +
      'P: نافذة تلقين منبثقة/مضمنة',
    shortcutsTitle: 'الاختصارات',
    speakingTime: 'وقت التحدث',
    trimVideo: 'قص الفيديو',
    exitTrim: 'خروج القص',
    audioSilentWarningMessage: 'يبدو أنه لا يصل أي صوت. حاول التحدث بصوت أعلى، وإذا لم تختفِ هذه الرسالة، أعد تحميل المتصفح.',
    processingVideoTooltip: 'يتم معالجة الفيديو، يرجى الانتظار لحظة',
    prompterCountdown: 'عد تنازلي',
    prompterCountdownMinutes: 'د',
    prompterCountdownSeconds: 'ث',
    prompterCountdownSet: 'تعيين',
    prompterCountdownStart: 'بدء',
    prompterCountdownPause: 'إيقاف مؤقت',
    prompterCountdownReset: 'إعادة ضبط',
    prompterCountdownEditDuration: 'تغيير المدة',
  },
  pt: {
    defaultScript:
      'Seu script vai aqui.\n\n' +
      'Espaço: reproduzir/pausar\n' +
      'R: gravar/parar gravação\n' +
      'D: mostrar e baixar vídeos\n' +
      'C: controles do teleprompter\n' +
      'H: mostrar/ocultar teleprompter\n' +
      'I: controlar entradas\n\n' +
      'Para usar a renderização e fonte Markdown, abra o painel de edição (T) e ative (M)\n\n' +
      'F: tela cheia\n' +
      'Y: fixar/desafixar do topo\n' +
      'P: destacar/embutir teleprompter',
    language: 'Idioma',
    script: 'Script',
    enableMarkdown: 'Ativar Markdown',
    close: 'Fechar',
    saveScript: 'Salvar',
    scriptSaved: 'Salvo',
    deleteSavedScript: 'Excluir script salvo',
    savedScripts: 'Scripts salvos',
    noSavedScripts: 'Nenhum script salvo ainda.',
    savedScriptsInfo: 'Salvos localmente neste navegador.',
    replaceCurrentScript: 'Substituir script atual',
    backToScript: 'Voltar ao script',
    backToSavedScripts: 'Voltar à lista',
    savedAt: 'Salvo',
    savedScriptPreview: 'Script salvo',
    emptySavedScript: '(Script vazio)',
    hidePrompter: 'Ocultar teleprompter',
    showPrompter: 'Mostrar teleprompter',
    controls: 'Controles',
    drag: 'Arrastar',
    mirrorText: 'Espelhar texto',
    alignLeft: 'Esquerda',
    alignCenter: 'Centro',
    alignRight: 'Direita',
    mirrorVideo: 'Espelhar vídeo',
    speed: 'Velocidade',
    textSize: 'Tamanho do texto',
    opacity: 'Opacidade',
    text: 'Editar texto',
    camera: 'Câmera',
    mic: 'Microfone',
    inputs: 'Entradas',
    videos: 'Vídeos',
    download: 'Baixar',
    record: 'Gravar',
    stopRecording: 'Parar gravação',
    startRecording: 'Iniciar gravação',
    playPrompter: 'Reproduzir teleprompter',
    pausePrompter: 'Pausar teleprompter',
    playVideo: 'Reproduzir vídeo',
    pauseVideo: 'Pausar vídeo',
    inputsTitle: 'Entradas',
    videosTitle: 'Vídeos',
    noCameras: 'Sem câmeras',
    noMics: 'Sem microfones',
    on: 'Ligado',
    off: 'Desligado',
    recordFirstVideo: 'Grave seu primeiro vídeo para baixar.',
    takeLabel: (index) => `Take ${index}`,
    downloadTakeLabel: (index) => `Baixar take ${index}`,
    deleteTakeLabel: (index) => `Excluir take ${index}`,
    storageTooltip: 'Armazenamento do navegador usado pelas suas gravações. Não é possível gravar além de 90%. Delete vídeos para liberar espaço.',
    memoryWarningTitle: 'Os vídeos estão armazenados localmente',
    memoryWarningMessage: 'Muitas gravações podem usar memória significativa. Baixe e exclua as gravações que não precisa.',
    browserWarningTitle: 'Compatibilidade do navegador',
    browserWarningMessage: 'teleme funciona melhor no Chrome devido a limitações de compatibilidade. Existem bugs conhecidos ao usar em outros navegadores.',
    continue: 'Continuar',
    confirm: 'Confirmar',
    clearAll: 'Limpar tudo',
    deleteAllConfirm: 'Excluir tudo?',
    confirmQuestion: 'Confirmar?',
    inputsTooltip: 'Entradas',
    aboutMessage: 'teleme é um teleprompter de código aberto - 100% gratuito, não requer login e baseado em navegador. Foi desenvolvido por ',
    fullscreen: 'Tela cheia',
    enterFullscreen: 'Entrar em tela cheia',
    exitFullscreen: 'Sair de tela cheia',
    fixToTop: 'Fixar no topo',
    unfixFromTop: 'Desfixar do topo',
    persistVideos: 'Salvar vídeos localmente',
    persistVideosTooltip: 'Por padrão, os vídeos são salvos na memória local e limitados a 10 vídeos salvos de cada vez. Desative para habilitar o armazenamento temporário e baixe todos os vídeos gravados antes de atualizar o site.',
    persistVideosWillSave10: 'Salvará os 10 vídeos mais recentes localmente. Ative para mantê-los entre recarregamentos.',
    maxVideosReached: 'Máximo de 10 vídeos podem ser salvos localmente. Exclua alguns vídeos ou desative o armazenamento persistente para gravar mais.',
    deleteKey: 'delete',
    popOutPrompter: 'Destacar',
    popInPrompter: 'Anexar',
    pipEditHint: 'Para editar o texto, volte ao site e abra o painel do editor de texto (T).',
    popOutOnlyChrome: 'O modo pop-out não é possível no Safari. Use o Chrome para melhor compatibilidade.',
    allowCameraAccess: 'Permitir acesso à câmera',
    braveBlockedMessage: 'O Brave bloqueou o acesso à câmera. Clique no ícone Shields ou no ícone de cadeado na barra de endereços para redefinir as permissões e desativar a proteção contra impressão digital para este site. Use o Chrome para melhor compatibilidade.',
    autoScroll: 'Rolagem automática',
    autoScrolling: 'Rolagem automática em andamento',
    autoScrollStartPlaying: 'Inicie a reprodução para rolagem automática',
    autoScrollSpeed: 'Velocidade de rolagem automática',
    autoScrollSpeedTooltip: 'Palavras por minuto na rolagem automática',
    shortcutsMenu:
      'Espaço: reproduzir/pausar\n' +
      'R: gravar/parar gravação\n' +
      'D: mostrar e baixar vídeos\n' +
      'C: controles do teleprompter\n' +
      'H: mostrar/ocultar teleprompter\n' +
      'I: controlar entradas\n' +
      'T: Editar texto\n' +
      'M: Ativar Markdown\n' +
      'V: rolagem automática\n' +
      'F: tela cheia\n' +
      'Y: fixar/desafixar do topo\n' +
      'P: destacar/embutir teleprompter',
    shortcutsTitle: 'Atalhos',
    speakingTime: 'Tempo de fala',
    trimVideo: 'Aparar vídeo',
    exitTrim: 'Sair do corte',
    audioSilentWarningMessage: 'Parece que nenhum áudio está chegando. Tente falar mais alto e, se esta mensagem não desaparecer, recarregue o navegador.',
    processingVideoTooltip: 'O vídeo está sendo processado, por favor aguarde um momento',
    prompterCountdown: 'Contagem regressiva',
    prompterCountdownMinutes: 'Min',
    prompterCountdownSeconds: 'Seg',
    prompterCountdownSet: 'Definir',
    prompterCountdownStart: 'Iniciar',
    prompterCountdownPause: 'Pausar',
    prompterCountdownReset: 'Repor',
    prompterCountdownEditDuration: 'Alterar duração',
  },
  ru: {
    defaultScript:
      'Ваш текст здесь.\n\n' +
      'Пробел: воспроизвести/пауза\n' +
      'R: запись/остановить запись\n' +
      'D: показать и скачать видео\n' +
      'C: управление телесуфлёром\n' +
      'H: скрыть/показать телесуфлёр\n' +
      'I: управление входами\n\n' +
      'Чтобы использовать Markdown и шрифт, откройте панель редактирования (T) и включите (M)\n\n' +
      'V: Автопрокрутка\n\n' +
      'F: полный экран\n' +
      'Y: закрепить/открепить сверху\n' +
      'P: отдельное окно телесуфлёра',
    language: 'Язык',
    script: 'Скрипт',
    enableMarkdown: 'Включить Markdown',
    close: 'Закрыть',
    saveScript: 'Сохранить',
    scriptSaved: 'Сохранено',
    deleteSavedScript: 'Удалить сохранённый скрипт',
    savedScripts: 'Сохранённые скрипты',
    noSavedScripts: 'Пока нет сохранённых скриптов.',
    savedScriptsInfo: 'Сохраняются локально в этом браузере.',
    replaceCurrentScript: 'Заменить текущий скрипт',
    backToScript: 'Назад к скрипту',
    backToSavedScripts: 'Назад к списку',
    savedAt: 'Сохранено',
    savedScriptPreview: 'Сохранённый скрипт',
    emptySavedScript: '(Пустой скрипт)',
    hidePrompter: 'Скрыть телесуфлёр',
    showPrompter: 'Показать телесуфлёр',
    controls: 'Управление',
    drag: 'Перетаскивание',
    mirrorText: 'Отразить текст',
    alignLeft: 'Слева',
    alignCenter: 'По центру',
    alignRight: 'Справа',
    mirrorVideo: 'Отразить видео',
    speed: 'Скорость',
    textSize: 'Размер текста',
    opacity: 'Прозрачность',
    text: 'Редактировать текст',
    camera: 'Камера',
    mic: 'Микрофон',
    inputs: 'Входы',
    videos: 'Видео',
    download: 'Скачать',
    record: 'Запись',
    stopRecording: 'Остановить запись',
    startRecording: 'Начать запись',
    playPrompter: 'Запустить телесуфлёр',
    pausePrompter: 'Пауза',
    playVideo: 'Воспроизвести видео',
    pauseVideo: 'Приостановить видео',
    inputsTitle: 'Входы',
    videosTitle: 'Видео',
    noCameras: 'Нет камер',
    noMics: 'Нет микрофонов',
    on: 'Вкл',
    off: 'Выкл',
    recordFirstVideo: 'Запишите первое видео для скачивания.',
    takeLabel: (index) => `Дубль ${index}`,
    downloadTakeLabel: (index) => `Скачать дубль ${index}`,
    deleteTakeLabel: (index) => `Удалить дубль ${index}`,
    storageTooltip: 'Хранилище браузера, используемое вашими записями. Запись невозможна после 90%. Удалите видео, чтобы освободить место.',
    memoryWarningTitle: 'Видео хранятся локально',
    memoryWarningMessage: 'Много записей могут использовать значительную память. Скачайте и удалите записи, которые вам не нужны.',
    browserWarningTitle: 'Совместимость браузера',
    browserWarningMessage: 'teleme лучше всего работает в Chrome из-за ограничений совместимости. При использовании в других браузерах есть известные ошибки.',
    continue: 'Продолжить',
    confirm: 'Подтвердить',
    clearAll: 'Очистить все',
    deleteAllConfirm: 'Удалить все?',
    confirmQuestion: 'Подтвердить?',
    inputsTooltip: 'Входы',
    aboutMessage: 'teleme — это телесуфлёр с открытым исходным кодом, 100% бесплатный, не требует входа и работающий в браузере. Разработан ',
    fullscreen: 'Полноэкранный режим',
    enterFullscreen: 'Войти в полноэкранный режим',
    exitFullscreen: 'Выйти из полноэкранного режима',
    fixToTop: 'Закрепить сверху',
    unfixFromTop: 'Открепить сверху',
    persistVideos: 'Сохранять видео локально',
    persistVideosTooltip: 'По умолчанию видео сохраняются в локальной памяти и ограничены 10 сохраненными видео одновременно. Отключите, чтобы включить временное хранение, и скачайте все записанные видео перед обновлением сайта.',
    persistVideosWillSave10: 'Сохранит 10 последних видео локально. Включите, чтобы сохранить их между перезагрузками.',
    maxVideosReached: 'Максимум 10 видео можно сохранить локально. Удалите некоторые видео или отключите постоянное хранилище, чтобы записать больше.',
    deleteKey: 'delete',
    popOutPrompter: 'Открепить',
    popInPrompter: 'Прикрепить',
    pipEditHint: 'Для редактирования текста вернитесь на сайт и откройте панель текстового редактора (T).',
    popOutOnlyChrome: 'Вынос окна невозможен в Safari. Используйте Chrome для лучшей совместимости.',
    allowCameraAccess: 'Разрешить доступ к камере',
    braveBlockedMessage: 'Brave заблокировал доступ к камере. Нажмите на значок Shields или значок замка в адресной строке, чтобы сбросить разрешения и отключить защиту от цифровых отпечатков для этого сайта. Используйте Chrome для лучшей совместимости.',
    autoScroll: 'Автопрокрутка',
    autoScrolling: 'Идёт автопрокрутка',
    autoScrollStartPlaying: 'Начните воспроизведение для автопрокрутки',
    autoScrollSpeed: 'Скорость автопрокрутки',
    autoScrollSpeedTooltip: 'Слов в минуту при автопрокрутке',
    shortcutsMenu:
      'Пробел: воспроизвести/пауза\n' +
      'R: запись/остановить запись\n' +
      'D: показать и скачать видео\n' +
      'C: управление телесуфлёром\n' +
      'H: скрыть/показать телесуфлёр\n' +
      'I: управление входами\n' +
      'T: Редактировать текст\n' +
      'M: Включить Markdown\n' +
      'V: автопрокрутка\n' +
      'F: полный экран\n' +
      'Y: закрепить/открепить сверху\n' +
      'P: отдельное окно телесуфлёра',
    shortcutsTitle: 'Горячие клавиши',
    speakingTime: 'Время речи',
    trimVideo: 'Обрезать видео',
    exitTrim: 'Выход из обрезки',
    audioSilentWarningMessage: 'Похоже, звук не поступает. Попробуйте говорить громче, и если это сообщение не исчезнет, перезагрузите браузер.',
    processingVideoTooltip: 'Видео обрабатывается, пожалуйста, подождите немного',
    prompterCountdown: 'Таймер дубля',
    prompterCountdownMinutes: 'Мин',
    prompterCountdownSeconds: 'Сек',
    prompterCountdownSet: 'Задать',
    prompterCountdownStart: 'Старт',
    prompterCountdownPause: 'Пауза',
    prompterCountdownReset: 'Сброс',
    prompterCountdownEditDuration: 'Изменить длительность',
  },
  pl: {
    defaultScript:
      'Twój tekst tutaj.\n\n' +
      'Spacja: odtwarzaj/pauzuj\n' +
      'R: nagraj/zatrzymaj nagrywanie\n' +
      'D: pokaż i pobierz wideo\n' +
      'C: sterowanie teleprompterem\n' +
      'H: ukryj/pokaż teleprompter\n' +
      'I: sterowanie wejściami\n\n' +
      'Aby używać renderowania i czcionki Markdown, otwórz panel edycji tekstu (T) i włącz go (M)\n\n' +
      'V: Automatyczne przewijanie\n\n' +
      'F: pełny ekran\n' +
      'Y: przypnij/odepnij od góry\n' +
      'P: teleprompter w wyskakującym okienku',
    language: 'Język',
    script: 'Tekst',
    enableMarkdown: 'Włącz Markdown',
    close: 'Zamknij',
    saveScript: 'Zapisz',
    scriptSaved: 'Zapisano',
    deleteSavedScript: 'Usuń zapisany skrypt',
    savedScripts: 'Zapisane skrypty',
    noSavedScripts: 'Brak zapisanych skryptów.',
    savedScriptsInfo: 'Zapisywane lokalnie w tej przeglądarce.',
    replaceCurrentScript: 'Zastąp bieżący skrypt',
    backToScript: 'Wróć do skryptu',
    backToSavedScripts: 'Wróć do listy',
    savedAt: 'Zapisano',
    savedScriptPreview: 'Zapisany skrypt',
    emptySavedScript: '(Pusty skrypt)',
    hidePrompter: 'Ukryj prompter',
    showPrompter: 'Pokaż prompter',
    controls: 'Sterowanie',
    drag: 'Przeciągnij',
    mirrorText: 'Odbij tekst',
    alignLeft: 'Lewo',
    alignCenter: 'Środek',
    alignRight: 'Prawo',
    mirrorVideo: 'Odbij wideo',
    speed: 'Prędkość',
    textSize: 'Rozmiar tekstu',
    opacity: 'Przezroczystość',
    text: 'Edytuj tekst',
    camera: 'Kamera',
    mic: 'Mikrofon',
    inputs: 'Wejścia',
    videos: 'Wideo',
    download: 'Pobierz',
    record: 'Nagraj',
    stopRecording: 'Zatrzymaj nagrywanie',
    startRecording: 'Rozpocznij nagrywanie',
    playPrompter: 'Odtwarzaj prompter',
    pausePrompter: 'Pauzuj prompter',
    playVideo: 'Odtwarzaj wideo',
    pauseVideo: 'Pauzuj wideo',
    inputsTitle: 'Wejścia',
    videosTitle: 'Wideo',
    noCameras: 'Brak kamer',
    noMics: 'Brak mikrofonów',
    on: 'Wł.',
    off: 'Wył.',
    recordFirstVideo: 'Nagraj swoje pierwsze wideo, aby je pobrać.',
    takeLabel: (index) => `Ujęcie ${index}`,
    downloadTakeLabel: (index) => `Pobierz ujęcie ${index}`,
    deleteTakeLabel: (index) => `Usuń ujęcie ${index}`,
    storageTooltip: 'Pamięć przeglądarki używana przez twoje nagrania. Nie możesz nagrywać powyżej 90%. Usuń filmy, aby zwolnić miejsce.',
    memoryWarningTitle: 'Wideo są przechowywane lokalnie',
    memoryWarningMessage: 'Wiele nagrań może zużywać dużo pamięci. Pobierz i usuń nagrania, których nie potrzebujesz.',
    browserWarningTitle: 'Kompatybilność przeglądarki',
    browserWarningMessage: 'teleme działa najlepiej w Chrome ze względu na ograniczenia kompatybilności. Istnieją znane błędy podczas używania w innych przeglądarkach.',
    continue: 'Kontynuuj',
    confirm: 'Potwierdź',
    clearAll: 'Wyczyść wszystko',
    deleteAllConfirm: 'Usunąć wszystko?',
    confirmQuestion: 'Potwierdzić?',
    inputsTooltip: 'Wejścia',
    aboutMessage: 'teleme to teleprompter open-source - w 100% darmowy, nie wymaga logowania i działa w przeglądarce. Został stworzony przez ',
    fullscreen: 'Pełny ekran',
    enterFullscreen: 'Wejdź w pełny ekran',
    exitFullscreen: 'Wyjdź z pełnego ekranu',
    fixToTop: 'Przypnij do góry',
    unfixFromTop: 'Odepnij od góry',
    persistVideos: 'Zapisuj wideo lokalnie',
    persistVideosTooltip: 'Domyślnie filmy są zapisywane w pamięci lokalnej i ograniczone do 10 filmów zapisanych naraz. Wyłącz tę opcję, aby włączyć tymczasowe przechowywanie i pobierz wszystkie nagrane filmy przed odświeżeniem strony.',
    persistVideosWillSave10: 'Zapisze 10 ostatnich wideo lokalnie. Włącz, aby zachować je po przeładowaniu.',
    maxVideosReached: 'Maksymalnie 10 wideo może być zapisanych lokalnie. Usuń niektóre wideo lub wyłącz trwałe przechowywanie, aby nagrać więcej.',
    deleteKey: 'delete',
    popOutPrompter: 'Odepnij',
    popInPrompter: 'Przypnij',
    pipEditHint: 'Aby edytować tekst, wróć do witryny i otwórz panel edytora tekstu (T).',
    popOutOnlyChrome: 'Tryb wyskakującego okna nie jest możliwy w Safari. Używaj Chrome dla lepszej kompatybilności.',
    allowCameraAccess: 'Zezwól na dostęp do kamery',
    braveBlockedMessage: 'Brave zablokował dostęp do kamery. Kliknij ikonę Shields lub ikonę kłódki w pasku adresu, aby zresetować uprawnienia i wyłączyć ochronę przed pobieraniem odcisków palców dla tej witryny. Używaj Chrome dla lepszej kompatybilności.',
    autoScroll: 'Automatyczne przewijanie',
    autoScrolling: 'Trwa automatyczne przewijanie',
    autoScrollStartPlaying: 'Uruchom odtwarzanie, aby przewijać automatycznie',
    autoScrollSpeed: 'Szybkość automatycznego przewijania',
    autoScrollSpeedTooltip: 'Słowa na minutę podczas automatycznego przewijania',
    shortcutsMenu:
      'Spacja: odtwarzaj/wstrzymaj\n' +
      'R: nagrywaj/zatrzymaj nagrywanie\n' +
      'D: pokaż i pobierz wideo\n' +
      'C: sterowanie teleprompterem\n' +
      'H: ukryj/pokaż teleprompter\n' +
      'I: sterowanie wejściami\n' +
      'T: Edytuj tekst\n' +
      'M: Włącz Markdown\n' +
      'V: automatyczne przewijanie\n' +
      'F: pełny ekran\n' +
      'Y: przypnij/odepnij od góry\n' +
      'P: teleprompter w wyskakującym okienku',
    shortcutsTitle: 'Skróty',
    speakingTime: 'Czas mówienia',
    trimVideo: 'Przytnij wideo',
    exitTrim: 'Wyjdź z przycinania',
    audioSilentWarningMessage: 'Wygląda na to, że żaden dźwięk nie dociera. Spróbuj mówić głośniej, a jeśli ta wiadomość nie zniknie, przeładuj przeglądarkę.',
    processingVideoTooltip: 'Wideo jest przetwarzane, proszę chwilę poczekać',
    prompterCountdown: 'Odliczanie',
    prompterCountdownMinutes: 'Min',
    prompterCountdownSeconds: 'Sek',
    prompterCountdownSet: 'Ustaw',
    prompterCountdownStart: 'Start',
    prompterCountdownPause: 'Pauza',
    prompterCountdownReset: 'Reset',
    prompterCountdownEditDuration: 'Zmień czas',
  },
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
