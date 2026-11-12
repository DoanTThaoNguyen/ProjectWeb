import { useState, type ReactNode, type ImgHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

const FALLBACK = '/images/placeholder.svg'

/** Anh co anh du phong khi loi. */
export function Img({ src, alt, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      {...rest}
      src={!src || failed ? FALLBACK : src}
      alt={alt ?? ''}
      loading={rest.loading ?? 'lazy'}
      onError={() => setFailed(true)}
    />
  )
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="state state-loading" role="status">
      <span className="spinner" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon" aria-hidden>!</div>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state-empty">
      <div className="state-icon empty" aria-hidden>
        ◌
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'warn' | 'danger'; children: ReactNode }) {
  return <div className={`alert alert-${tone}`}>{children}</div>
}

export function Badge({ tone = 'muted', children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Field({
  label,
  error,
  hint,
  children,
  required,
}: {
  label: string
  error?: string
  hint?: ReactNode
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function PageHeader({ title, subtitle, crumbs }: { title: string; subtitle?: ReactNode; crumbs?: { to?: string; label: string }[] }) {
  return (
    <div className="page-header">
      <div className="container">
        {crumbs && (
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Trang chủ</Link>
            {crumbs.map((c, i) => (
              <span key={i}>
                <span className="sep">/</span>
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="lead">{subtitle}</p>}
      </div>
    </div>
  )
}
