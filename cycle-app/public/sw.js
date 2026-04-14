// Cycle — Push Notification Service Worker

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Cycle'
  const options = {
    body: data.body || 'Your daily content is ready',
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'cycle-daily',
    data: { url: data.url || '/' },
    actions: data.actions || [],
    vibrate: [100, 50, 100],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new tab
      return clients.openWindow(url)
    })
  )
})
