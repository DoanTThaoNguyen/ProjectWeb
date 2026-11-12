import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage } from './client'

/** Goi GET va quan ly trang thai dang tai / loi / du lieu. path = null -> khong goi. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(!!path)
  const [tick, setTick] = useState(0)
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!path) {
      setLoading(false)
      return
    }
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setLoading(true)
    setError(null)
    api<T>(path, { signal: c.signal })
      .then((d) => {
        if (!c.signal.aborted) setData(d)
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setError(errorMessage(e))
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false)
      })
    return () => c.abort()
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload, setData }
}
