import { API_URL } from '../config'

const TOKEN_KEY = 'tiecnha.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* bo qua khi trinh duyet chan storage */
  }
}

/** Loi tu API: code on dinh + message tieng Viet + loi tung truong. */
export class ApiError extends Error {
  status: number
  code: string
  fields?: Record<string, string>
  details?: unknown
  constructor(status: number, code: string, message: string, fields?: Record<string, string>, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
    this.details = details
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

type Opts = { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal }

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers ?? {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK', 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng hoặc thử lại sau.')
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const d = (data ?? {}) as { code?: string; message?: string; fields?: Record<string, string>; details?: unknown }
    if (res.status === 401 && token) {
      setToken(null)
      onUnauthorized?.()
    }
    const msg =
      d.message ??
      (res.status === 401 ? 'Vui lòng đăng nhập' : res.status === 403 ? 'Bạn không có quyền thực hiện thao tác này' : 'Đã có lỗi xảy ra')
    throw new ApiError(res.status, d.code ?? 'HTTP_' + res.status, msg, d.fields, d.details)
  }
  return data as T
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.fields && Object.keys(e.fields).length) return Object.values(e.fields)[0]
    return e.message
  }
  return 'Đã có lỗi xảy ra, vui lòng thử lại'
}
