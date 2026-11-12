const vnd = new Intl.NumberFormat('vi-VN')

/** 2990000 -> "2.990.000đ" */
export function money(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return vnd.format(Math.round(v)) + 'đ'
}

/** 289000 -> "289K", 2990000 -> "2,99 triệu" */
export function moneyShort(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu'
  if (v >= 1000) return Math.round(v / 1000) + 'K'
  return String(v)
}

function parse(d: string | Date): Date {
  return typeof d === 'string' ? new Date(d.length <= 10 ? d + 'T00:00:00' : d) : d
}

export function date(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return parse(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function dateShort(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return parse(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function time(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return parse(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function dateTime(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return `${time(d)} · ${dateShort(d)}`
}

/** "18:00 – 22:00, T5 20/11/2026" */
export function timeRange(start: string, end: string): string {
  const s = parse(start)
  const e = parse(end)
  const sameDay = s.toDateString() === e.toDateString()
  return sameDay ? `${time(s)} – ${time(e)}, ${date(s)}` : `${dateTime(s)} → ${dateTime(e)}`
}

/** Gia tri cho <input type="datetime-local"> theo gio dia phuong. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/

export function priceUnitLabel(unit: string, guestsPerTable?: number | null): string {
  return unit === 'TABLE' ? `/bàn${guestsPerTable ? ` (${guestsPerTable} khách)` : ''}` : '/khách'
}
