/* LinkHub admin notification service worker. Never caches admin data. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let payload = { title: 'LinkHub', body: 'New activity', url: '/admn' };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch { /* default text */ }
  const safeUrl = typeof payload.url === 'string' && payload.url.startsWith('/admn') ? payload.url : '/admn';
  event.waitUntil(self.registration.showNotification(String(payload.title).slice(0,100), {
    body: String(payload.body).slice(0,250),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: safeUrl },
    tag: payload.tag || undefined,
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(event.notification.data?.url || '/admn', self.location.origin).href;
    const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const page of pages) {
      if (page.url.startsWith(self.location.origin + '/admn')) { await page.focus(); page.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});
