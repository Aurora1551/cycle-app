/**
 * Web Push Notifications — register service worker, subscribe, and manage push
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    console.log('[Push] Service worker registered')
    return reg
  } catch (err) {
    console.error('[Push] Service worker registration failed:', err)
    return null
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[Push] Push not supported in this browser')
    return false
  }

  try {
    const reg = await navigator.serviceWorker.ready

    // Check if already subscribed
    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
      console.log('[Push] New subscription created')
    } else {
      console.log('[Push] Existing subscription found')
    }

    // Send subscription to server
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
      }),
    })

    const data = await res.json()
    if (data.success) {
      console.log('[Push] Subscription saved to server')
      return true
    }
    console.error('[Push] Server rejected subscription:', data.error)
    return false
  } catch (err) {
    console.error('[Push] Subscribe failed:', err)
    return false
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    console.log('[Push] Unsubscribed')
    return true
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err)
    return false
  }
}

export async function getPushStatus(): Promise<'granted' | 'denied' | 'default'> {
  if (!isPushSupported()) return 'denied'
  return Notification.permission
}
