import posthog from 'posthog-js'

const rawKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined
// Treat placeholder values as "not configured" so dev without a real key is silent.
const isPlaceholder = !rawKey || rawKey.trim() === '' || rawKey.startsWith('your-') || rawKey === 'placeholder'
const key = isPlaceholder ? undefined : rawKey

if (key) {
  posthog.init(key, { api_host: 'https://app.posthog.com', autocapture: false, capture_pageview: false })
}

export const track = (event: string, props?: Record<string, string | number | boolean>) => {
  if (!key) return
  posthog.capture(event, props)
}

export default posthog
