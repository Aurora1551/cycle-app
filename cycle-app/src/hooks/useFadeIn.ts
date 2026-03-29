import { useState, useEffect } from 'react'

export function useFadeIn(delay = 60): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return visible
}
