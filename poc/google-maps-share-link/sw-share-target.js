self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method === 'POST' && requestUrl.pathname === '/share-target') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const payload = {
      title: String(formData.get('title') ?? ''),
      text: String(formData.get('text') ?? ''),
      url: String(formData.get('url') ?? ''),
    };

    const target = new URL('/share-location-poc.html', self.location.origin);
    target.hash = `share=${encodeURIComponent(JSON.stringify(payload))}`;

    return Response.redirect(target.toString(), 303);
  } catch {
    const target = new URL('/share-location-poc.html', self.location.origin);
    target.hash = 'share-error=1';
    return Response.redirect(target.toString(), 303);
  }
}
