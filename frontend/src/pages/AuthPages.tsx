import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { homeFor, useAuth } from '../auth/AuthContext'
import { Alert, Field } from '../components/ui'
import { PHONE_RE } from '../utils/format'

const DEMO = [
  { email: 'khach@tiecnha.vn', label: 'Khách hàng' },
  { email: 'dieuphoi@tiecnha.vn', label: 'Điều phối' },
  { email: 'bep.tuan@tiecnha.vn', label: 'Nhân viên (đầu bếp)' },
  { email: 'admin@tiecnha.vn', label: 'Quản trị' },
]

function useRedirect() {
  const loc = useLocation()
  return (loc.state as { from?: string } | null)?.from
}

export function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const from = useRedirect()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErr('Vui lòng nhập email và mật khẩu')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const u = await login(email.trim(), password)
      const target = from && from !== '/dang-nhap' && (u.role === 'CUSTOMER' || !from.startsWith('/dat-tiec')) ? from : homeFor(u)
      nav(target, { replace: true })
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>Đăng nhập</h1>
        <p className="muted">Đăng nhập để gửi yêu cầu đặt tiệc và theo dõi đơn.</p>
        {err && <Alert tone="danger">{err}</Alert>}
        <Field label="Email" required>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mật khẩu" required>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center' }} className="small">
          Chưa có tài khoản?{' '}
          <Link to="/dang-ky" state={{ from }}>
            Đăng ký ngay
          </Link>
        </p>
        {import.meta.env.DEV && (
          <div className="demo-accounts">
            <strong>Tài khoản demo</strong> (mật khẩu <code>Demo@123</code>) – bấm để điền:
            {DEMO.map((d) => (
              <button
                type="button"
                key={d.email}
                onClick={() => {
                  setEmail(d.email)
                  setPassword('Demo@123')
                }}
              >
                {d.label}: {d.email}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const nav = useNavigate()
  const from = useRedirect()
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.fullName.trim()) er.fullName = 'Vui lòng nhập họ tên'
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'Email không hợp lệ'
    if (!PHONE_RE.test(f.phone.trim())) er.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)'
    if (f.password.length < 6) er.password = 'Mật khẩu tối thiểu 6 ký tự'
    if (f.confirm !== f.password) er.confirm = 'Mật khẩu nhập lại không khớp'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    setErr(null)
    try {
      await register({ fullName: f.fullName.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.password })
      nav(from ?? '/don-cua-toi', { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields)
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>Tạo tài khoản</h1>
        <p className="muted">Tài khoản khách hàng để đặt tiệc, nhận báo giá và theo dõi đơn.</p>
        {err && <Alert tone="danger">{err}</Alert>}
        <Field label="Họ và tên" required error={errors.fullName}>
          <input className="input" autoComplete="name" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Số điện thoại" required error={errors.phone}>
          <input className="input" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="Mật khẩu" required error={errors.password}>
            <input className="input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} />
          </Field>
          <Field label="Nhập lại" required error={errors.confirm}>
            <input className="input" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => set('confirm', e.target.value)} />
          </Field>
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Đang tạo…' : 'Đăng ký'}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center' }} className="small">
          Đã có tài khoản?{' '}
          <Link to="/dang-nhap" state={{ from }}>
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  )
}
