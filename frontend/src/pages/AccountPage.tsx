import { useState, type FormEvent } from 'react'
import { api, ApiError, errorMessage } from '../api/client'
import type { User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert, Field, PageHeader } from '../components/ui'
import { PHONE_RE } from '../utils/format'
import { ROLE_LABEL } from '../utils/labels'

export default function AccountPage() {
  const { user, setUser } = useAuth()
  const [f, setF] = useState({ fullName: user?.fullName ?? '', phone: user?.phone ?? '', address: user?.address ?? '' })
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [pwMsg, setPwMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)

  if (!user) return null

  async function save(e: FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.fullName.trim()) er.fullName = 'Vui lòng nhập họ tên'
    if (!PHONE_RE.test(f.phone.trim())) er.phone = 'Số điện thoại không hợp lệ'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      const u = await api<User>('/api/me', { method: 'PUT', body: f })
      setUser(u)
      setMsg({ tone: 'ok', text: 'Đã lưu thông tin tài khoản' })
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields)
      setMsg({ tone: 'danger', text: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  async function changePw(e: FormEvent) {
    e.preventDefault()
    if (pw.newPassword.length < 6) {
      setPwMsg({ tone: 'danger', text: 'Mật khẩu mới tối thiểu 6 ký tự' })
      return
    }
    try {
      await api('/api/me/password', { method: 'PUT', body: pw })
      setPw({ currentPassword: '', newPassword: '' })
      setPwMsg({ tone: 'ok', text: 'Đã đổi mật khẩu' })
    } catch (e) {
      setPwMsg({ tone: 'danger', text: errorMessage(e) })
    }
  }

  return (
    <>
      <PageHeader title="Thông tin tài khoản" crumbs={[{ label: 'Tài khoản' }]} />
      <section className="section-tight">
        <div className="container grid grid-2" style={{ alignItems: 'start' }}>
          <form className="card card-pad" onSubmit={save} noValidate>
            <h3>Hồ sơ</h3>
            <p className="muted small">
              {user.email} · {ROLE_LABEL[user.role]}
            </p>
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
            <Field label="Họ và tên" required error={errors.fullName}>
              <input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
            </Field>
            <Field label="Số điện thoại" required error={errors.phone}>
              <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </Field>
            <Field label="Địa chỉ mặc định" hint="Tự điền khi đặt tiệc">
              <input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            </Field>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </form>
          <form className="card card-pad" onSubmit={changePw}>
            <h3>Đổi mật khẩu</h3>
            {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
            <Field label="Mật khẩu hiện tại" required>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={pw.currentPassword}
                onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              />
            </Field>
            <Field label="Mật khẩu mới" required>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              />
            </Field>
            <button className="btn btn-outline">Đổi mật khẩu</button>
          </form>
        </div>
      </section>
    </>
  )
}
