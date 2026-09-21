const MAX_SHARE_FIELD_LENGTH = 4096;

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

function readShareField(formData, key) {
  return String(formData.get(key) ?? '').slice(0, MAX_SHARE_FIELD_LENGTH);
}

async function handleShareTarget(request) {
  const target = new URL('/', self.location.origin);

  try {
    const formData = await request.formData();
    const payload = {
      title: readShareField(formData, 'title'),
      text: readShareField(formData, 'text'),
      url: readShareField(formData, 'url'),
    };

    target.hash = `share=${encodeURIComponent(JSON.stringify(payload))}`;
  } catch {
    target.hash = 'share-error=1';
  }

  return Response.redirect(target.toString(), 303);
}
