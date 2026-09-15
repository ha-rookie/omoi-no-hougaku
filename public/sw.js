self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'POST' || requestUrl.pathname !== '/share-target') return;

  event.respondWith((async () => {
    try {
      const formData = await event.request.formData();
      const payload = {
        title: typeof formData.get('title') === 'string' ? formData.get('title') : null,
        text: typeof formData.get('text') === 'string' ? formData.get('text') : null,
        url: typeof formData.get('url') === 'string' ? formData.get('url') : null,
      };

      const target = new URL('/index.html', self.location.origin);
      target.hash = `share=${encodeURIComponent(JSON.stringify(payload))}`;
      return Response.redirect(target.toString(), 303);
    } catch {
      const target = new URL('/index.html', self.location.origin);
      target.hash = 'share-error=1';
      return Response.redirect(target.toString(), 303);
    }
  })());
});
