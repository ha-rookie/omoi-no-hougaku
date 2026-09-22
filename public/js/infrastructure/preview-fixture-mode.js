export function isPreviewFixtureMode({ search = '', hostname = '' } = {}) {
  try {
    const params = new URLSearchParams(String(search ?? ''));
    if (!params.getAll('preview_fixture').includes('1')) return false;

    const host = String(hostname ?? '').trim().toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host === 'omoi-no-hougaku.pages.dev') return false;

    return /^[a-z0-9-]+\.omoi-no-hougaku\.pages\.dev$/.test(host);
  } catch {
    return false;
  }
}
