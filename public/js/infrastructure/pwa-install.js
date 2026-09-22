let deferredInstallPrompt = null;

export function isStandaloneMode(windowRef = window, navigatorRef = navigator) {
  return Boolean(
    windowRef.matchMedia?.('(display-mode: standalone)')?.matches ||
    navigatorRef?.standalone === true
  );
}

export function isIosDevice(navigatorRef = navigator) {
  const ua = navigatorRef?.userAgent ?? '';
  const classicIos = /iPad|iPhone|iPod/.test(ua);
  const ipadDesktopMode =
    navigatorRef?.platform === 'MacIntel' &&
    Number(navigatorRef?.maxTouchPoints ?? 0) > 1;

  return classicIos || ipadDesktopMode;
}

export function setupPwaInstall({
  windowRef = window,
  documentRef = document,
  navigatorRef = navigator,
} = {}) {
  const panel = documentRef.querySelector('#pwa-install-panel');
  const button = documentRef.querySelector('#pwa-install-button');
  const help = documentRef.querySelector('#pwa-install-help');

  if (!panel || !button || !help) return;

  const hide = () => {
    panel.hidden = true;
    button.hidden = true;
    button.disabled = false;
  };

  if (isStandaloneMode(windowRef, navigatorRef)) {
    hide();
    return;
  }

  panel.hidden = false;
  help.textContent = isIosDevice(navigatorRef)
    ? 'Safariの共有メニューから「ホーム画面に追加」を選んでください。'
    : 'ブラウザのメニューに「アプリをインストール」または「ホーム画面に追加」がある場合は選んでください。';

  windowRef.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    button.hidden = false;
    help.textContent = 'この端末では、ここからアプリとして追加できます。';
  });

  button.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;

    button.disabled = true;
    try {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } finally {
      deferredInstallPrompt = null;
      button.hidden = true;
      button.disabled = false;
    }
  });

  windowRef.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hide();
  });
}
