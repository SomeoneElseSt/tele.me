import { createContext, createElement, useContext } from 'react'
import type { ReactNode } from 'react'

export type LocaleCode = 'en' | 'es' | 'ja' | 'hi' | 'fr' | 'de' | 'zh' | 'ar' | 'pt' | 'ru'

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
  { code: 'ru', label: 'Русский', short: 'RU' }
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
  memoryWarningTitle: string
  memoryWarningMessage: string
  browserWarningTitle: string
  browserWarningMessage: string
  continue: string
  inputsTooltip: string
  aboutMessage: string
}

const STRINGS: Record<LocaleCode, Strings> = {
  en: {
    defaultScript:
      'Your script goes here.\n\n' +
      'Space: play/pause\n' +
      'R: record/stop recording\n' +
      'D: show and download videos\n' +
      'C: teleprompter controls\n' +
      'H: hide/show prompter\n' +
      'I: control inputs\n\n' +
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
    record: 'Record',
    stopRecording: 'Stop recording',
    startRecording: 'Start recording',
    playPrompter: 'Play prompter',
    pausePrompter: 'Pause prompter',
    playVideo: 'Play video',
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
    memoryWarningTitle: 'Videos are stored locally',
    memoryWarningMessage: "Many recordings may use significant memory. Download and delete recordings you don't need.",
    browserWarningTitle: 'Browser Compatibility',
    browserWarningMessage: 'tele.me works best in Chrome or Safari due to compatibility limitations. There are known bugs when used in different browsers.',
    continue: 'Continue',
    inputsTooltip: 'Inputs',
    aboutMessage: 'tele.me is an open-source teleprompter - 100% free, no login required, and browser-based. It was developed by '
  },
  es: {
    defaultScript:
      'Tu guion va aquí.\n\n' +
      'Espacio: reproducir/pausar\n' +
      'R: grabar/detener grabación\n' +
      'D: mostrar y descargar videos\n' +
      'C: controles del teleprompter\n' +
      'H: ocultar/mostrar teleprompter\n' +
      'I: controlar entradas\n\n' +
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
    memoryWarningTitle: 'Los videos están almacenados localmente',
    memoryWarningMessage: 'Muchas grabaciones pueden usar mucha memoria. Descarga y elimina las grabaciones que no necesites.',
    browserWarningTitle: 'Compatibilidad del navegador',
    browserWarningMessage: 'tele.me funciona mejor en Chrome o Safari debido a limitaciones de compatibilidad. Hay errores conocidos al usar otros navegadores.',
    continue: 'Continuar',
    inputsTooltip: 'Entradas',
    aboutMessage: 'tele.me es un teleprompter de código abierto - 100% gratis, no requiere registro y basado en navegador. Fue desarrollado por '
  },
  ja: {
    defaultScript:
      'ここにスクリプトを書きます。\n\n' +
      'スペース: 再生/一時停止\n' +
      'R: 録画/録画停止\n' +
      'D: 動画を表示してダウンロード\n' +
      'C: プロンプター操作\n' +
      'H: プロンプター表示/非表示\n' +
      'I: 入力設定\n\n' +
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
    memoryWarningTitle: 'ビデオはローカルに保存されています',
    memoryWarningMessage: '多くの録画は大量のメモリを使用する可能性があります。不要な録画をダウンロードして削除してください。',
    browserWarningTitle: 'ブラウザ互換性',
    browserWarningMessage: 'tele.meは互換性の制限により、ChromeまたはSafariで最もよく動作します。他のブラウザで使用する場合、既知のバグがあります。',
    continue: '続ける',
    inputsTooltip: '入力',
    aboutMessage: 'tele.meはオープンソースのテレプロンプターです - 100%無料、ログイン不要、ブラウザベース。開発者: '
  },
  hi: {
    defaultScript:
      'आपकी स्क्रिप्ट यहाँ जाती है।\n\n' +
      'स्पेस: चलाएँ/रोकें\n' +
      'R: रिकॉर्ड/रिकॉर्डिंग बंद करें\n' +
      'D: वीडियो दिखाएँ और डाउनलोड करें\n' +
      'C: टेलीप्रॉम्प्टर नियंत्रण\n' +
      'H: टेलीप्रॉम्प्टर दिखाएँ/छिपाएँ\n' +
      'I: इनपुट नियंत्रित करें\n\n' +
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
    memoryWarningTitle: 'वीडियो स्थानीय रूप से संग्रहीत हैं',
    memoryWarningMessage: 'कई रिकॉर्डिंग महत्वपूर्ण मेमोरी का उपयोग कर सकते हैं। जिन रिकॉर्डिंग की आवश्यकता नहीं है उन्हें डाउनलोड और हटाएं।',
    browserWarningTitle: 'ब्राउज़र अनुकूलता',
    browserWarningMessage: 'tele.me अनुकूलता सीमाओं के कारण Chrome या Safari में सबसे अच्छा काम करता है। विभिन्न ब्राउज़रों में उपयोग करने पर ज्ञात बग हैं।',
    continue: 'जारी रखें',
    inputsTooltip: 'इनपुट',
    aboutMessage: 'tele.me एक ओपन-सोर्स टेलीप्रॉम्प्टर है - 100% मुफ्त, लॉगिन की आवश्यकता नहीं, और ब्राउज़र आधारित। इसे विकसित किया गया है '
  },
  fr: {
    defaultScript:
      'Votre script va ici.\n\n' +
      'Espace : lecture/pause\n' +
      'R : enregistrer/arrêter l\'enregistrement\n' +
      'T : éditer le texte du prompteur\n' +
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
    record: 'Enregistrer',
    stopRecording: 'Arrêter l’enregistrement',
    startRecording: 'Démarrer l’enregistrement',
    playPrompter: 'Lire le prompteur',
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
    memoryWarningTitle: 'Les vidéos sont stockées localement',
    memoryWarningMessage: "De nombreux enregistrements peuvent utiliser beaucoup de mémoire. Téléchargez et supprimez les enregistrements dont vous n'avez pas besoin.",
    browserWarningTitle: 'Compatibilité du navigateur',
    browserWarningMessage: 'tele.me fonctionne mieux dans Chrome ou Safari en raison de limitations de compatibilité. Il existe des bugs connus lors de l\'utilisation dans d\'autres navigateurs.',
    continue: 'Continuer',
    inputsTooltip: 'Entrées',
    aboutMessage: 'tele.me est un téléprompteur open-source - 100% gratuit, pas de connexion requise et basé sur navigateur. Il a été développé par '
  },
  de: {
    defaultScript:
      'Ihr Skript kommt hierher.\n\n' +
      'Leertaste: abspielen/pausieren\n' +
      'R: aufnehmen/Aufnahme stoppen\n' +
      'D: Videos anzeigen und herunterladen\n' +
      'C: Teleprompter-Steuerung\n' +
      'H: Teleprompter ein-/ausblenden\n' +
      'I: Eingänge steuern\n\n' +
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
    memoryWarningTitle: 'Videos sind lokal gespeichert',
    memoryWarningMessage: 'Viele Aufnahmen können viel Speicher verwenden. Laden Sie Aufnahmen herunter und löschen Sie die, die Sie nicht benötigen.',
    browserWarningTitle: 'Browser-Kompatibilität',
    browserWarningMessage: 'tele.me funktioniert aufgrund von Kompatibilitätseinschränkungen am besten in Chrome oder Safari. Es gibt bekannte Fehler bei der Verwendung in anderen Browsern.',
    continue: 'Fortfahren',
    inputsTooltip: 'Eingänge',
    aboutMessage: 'tele.me ist ein Open-Source-Teleprompter - 100% kostenlos, keine Anmeldung erforderlich und browserbasiert. Entwickelt von '
  },
  zh: {
    defaultScript:
      '你的脚本写在这里。\n\n' +
      '空格：播放/暂停\n' +
      'R：录制/停止录制\n' +
      'D：显示并下载视频\n' +
      'C：提示器控制\n' +
      'H：隐藏/显示提示器\n' +
      'I：控制输入\n\n' +
      '要使用 Markdown 渲染和字体，请打开文本编辑面板 (T) 并启用它 (M)',
    language: '语言',
    script: '脚本',
    enableMarkdown: '启用 Markdown',
    close: '关闭',
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
    memoryWarningTitle: '视频存储在本地',
    memoryWarningMessage: '大量录制可能会占用大量内存。下载并删除不需要的录制。',
    browserWarningTitle: '浏览器兼容性',
    browserWarningMessage: '由于兼容性限制，tele.me在Chrome或Safari中效果最佳。在其他浏览器中使用时存在已知错误。',
    continue: '继续',
    inputsTooltip: '输入',
    aboutMessage: 'tele.me是一个开源提词器 - 100%免费，无需登录，基于浏览器。开发者: '
  },
  ar: {
    defaultScript:
      'ضع النص هنا.\n\n' +
      'مسافة: تشغيل/إيقاف\n' +
      'R: تسجيل/إيقاف التسجيل\n' +
      'D: عرض وتنزيل الفيديوهات\n' +
      'C: عناصر التحكم بالتلقين\n' +
      'H: إظهار/إخفاء التلقين\n' +
      'I: التحكم بالمدخلات\n\n' +
      'لاستخدام عرض Markdown والخط، افتح لوحة تحرير النص (T) وفعّلها (M)',
    language: 'اللغة',
    script: 'النص',
    enableMarkdown: 'تمكين Markdown',
    close: 'إغلاق',
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
    memoryWarningTitle: 'الفيديوهات مخزنة محلياً',
    memoryWarningMessage: 'التسجيلات الكثيرة قد تستخدم ذاكرة كبيرة. قم بتنزيل وحذف التسجيلات التي لا تحتاجها.',
    browserWarningTitle: 'توافق المتصفح',
    browserWarningMessage: 'يعمل tele.me بشكل أفضل في Chrome أو Safari بسبب قيود التوافق. توجد أخطاء معروفة عند الاستخدام في متصفحات مختلفة.',
    continue: 'متابعة',
    inputsTooltip: 'المدخلات',
    aboutMessage: 'tele.me هو ملقن مفتوح المصدر - مجاني 100%، لا يتطلب تسجيل الدخول، ويعمل على المتصفح. تم تطويره بواسطة '
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
      'Para usar a renderização e fonte Markdown, abra o painel de edição (T) e ative (M)',
    language: 'Idioma',
    script: 'Script',
    enableMarkdown: 'Ativar Markdown',
    close: 'Fechar',
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
    memoryWarningTitle: 'Os vídeos estão armazenados localmente',
    memoryWarningMessage: 'Muitas gravações podem usar memória significativa. Baixe e exclua as gravações que não precisa.',
    browserWarningTitle: 'Compatibilidade do navegador',
    browserWarningMessage: 'tele.me funciona melhor no Chrome ou Safari devido a limitações de compatibilidade. Existem bugs conhecidos ao usar em outros navegadores.',
    continue: 'Continuar',
    inputsTooltip: 'Entradas',
    aboutMessage: 'tele.me é um teleprompter de código aberto - 100% gratuito, não requer login e baseado em navegador. Foi desenvolvido por '
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
      'Чтобы использовать Markdown и шрифт, откройте панель редактирования (T) и включите (M)',
    language: 'Язык',
    script: 'Скрипт',
    enableMarkdown: 'Включить Markdown',
    close: 'Закрыть',
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
    memoryWarningTitle: 'Видео хранятся локально',
    memoryWarningMessage: 'Много записей могут использовать значительную память. Скачайте и удалите записи, которые вам не нужны.',
    browserWarningTitle: 'Совместимость браузера',
    browserWarningMessage: 'tele.me лучше всего работает в Chrome или Safari из-за ограничений совместимости. При использовании в других браузерах есть известные ошибки.',
    continue: 'Продолжить',
    inputsTooltip: 'Входы',
    aboutMessage: 'tele.me — это телесуфлёр с открытым исходным кодом, 100% бесплатный, не требует входа и работающий в браузере. Разработан '
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
