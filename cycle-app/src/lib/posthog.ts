import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined

if (key) {
  posthog.init(key, { api_host: 'https://app.posthog.com', autocapture: false, capture_pageview: false })
}

export const track = (event: string, props?: Record<string, string | number | boolean>) => {
  if (!key) return
  posthog.capture(event, props)
}

export default posthog
