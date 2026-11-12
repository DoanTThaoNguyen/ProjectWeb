import { useState } from 'react'
import { api, ApiError, errorMessage } from '../../api/client'
import { useApi } from '../../api/useApi'
import type { Skill, StaffMember } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { AdminHeader } from '../../components/AdminLayout'
import { Alert, Badge, EmptyState, ErrorState, Field, Modal, Spinner } from '../../components/ui'
import { PHONE_RE } from '../../utils/format'
import { SKILLS } from '../../utils/labels'

type Form = {
  fullName: string
  phone: string
  email: string
  active: boolean
  note: string
  skills: Skill[]
  createAccount: boolean
  password: string
}

function StaffForm({ s, onClose, onSaved }: { s: StaffMember | null; onClose: () => void; onSaved: (m: StaffMember) => void }) {
  const [f, setF] = useState<Form>({
    fullName: s?.fullName ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    active: s?.active ?? true,
    note: s?.note ?? '',
    skills: s?.skills ?? [],
    createAccount: false,
    password: '',
  })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    const e: Record<string, string> = {}
    if (!f.fullName.trim()) e.fullName = 'Nhập họ tên'
    if (!PHONE_RE.test(f.phone.trim())) e.phone = 'Số điện thoại không hợp lệ'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Email không hợp lệ'
    if (!f.skills.length) e.skills = 'Chọn ít nhất một kỹ năng'
    if (f.createAccount && !f.email) e.email = 'Cần email để tạo tài khoản'
    if (f.createAccount && f.password.length < 8) e.password = 'Mật khẩu từ 8 ký tự'
    setErrs(e)
    if (Object.keys(e).length) return
    setBusy(true)
    setErr(null)
    try {
      const body = { ...f, email: f.email || null, note: f.note || null, password: f.createAccount ? f.password : null }
      const r = s ? await api<StaffMember>(`/api/admin/staff/${s.id}`, { method: 'PUT', body }) : await api<StaffMember>('/api/admin/staff', { body })
      onSaved(r)
    } catch (x) {
      setErr(errorMessage(x))
      if (x instanceof ApiError && x.fields) setErrs(x.fields)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={s ? `Sửa nhân viên – ${s.fullName}` : 'Thêm nhân viên'} onClose={onClose} busy={busy}>
      <div className="stack">
        <div className="form-row">
          <Field label="Họ tên" required error={errs.fullName}>
            <input className="input" maxLength={120} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
          </Field>
          <Field label="Số điện thoại" required error={errs.phone}>
            <input className="input" maxLength={12} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </div>
        <Field label="Email" error={errs.email}>
          <input className="input" type="email" maxLength={160} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Kỹ năng" required error={errs.skills}>
          <div className="chips" style={{ margin: 0 }}>
            {(Object.keys(SKILLS) as Skill[]).map((k) => (
              <button
                type="button"
                key={k}
                className={`chip ${f.skills.includes(k) ? 'active' : ''}`}
                onClick={() => setF({ ...f, skills: f.skills.includes(k) ? f.skills.filter((x) => x !== k) : [...f.skills, k] })}
              >
                {SKILLS[k]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Ghi chú">
          <input className="input" maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Đang hoạt động (bỏ chọn = ngừng, không xóa lịch sử)
        </label>
        {!s?.userId && (
          <>
            <label className="check">
              <input type="checkbox" checked={f.createAccount} onChange={(e) => setF({ ...f, createAccount: e.target.checked })} /> Tạo tài khoản đăng nhập
              cho nhân viên
            </label>
            {f.createAccount && (
              <Field label="Mật khẩu ban đầu" required error={errs.password}>
                <input className="input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              </Field>
            )}
          </>
        )}
        {err && <Alert tone="danger">{err}</Alert>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function StaffPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const { data, loading, error, reload } = useApi<StaffMember[]>('/api/coord/staff')
  const [edit, setEdit] = useState<{ s: StaffMember | null } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [skill, setSkill] = useState('')
  const [q, setQ] = useState('')

  const list = (data ?? []).filter(
    (s) => (!skill || s.skills.includes(skill as Skill)) && (!q || (s.fullName + ' ' + (s.phone ?? '')).toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <>
      <AdminHeader
        title="Nhân viên"
        subtitle={isAdmin ? 'Quản lý hồ sơ, kỹ năng và tài khoản đăng nhập.' : 'Danh sách nhân sự và kỹ năng (chỉ quản trị được chỉnh sửa).'}
        actions={
          isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setEdit({ s: null })}>
              + Thêm nhân viên
            </button>
          )
        }
      />
      {msg && <Alert tone="ok">{msg}</Alert>}
      <div className="card card-pad">
        <div className="filters-row">
          <input className="input" placeholder="Tìm tên, số điện thoại…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '2 1 200px' }} />
          <select className="input" value={skill} onChange={(e) => setSkill(e.target.value)} style={{ flex: '1 1 160px' }} aria-label="Kỹ năng">
            <option value="">Mọi kỹ năng</option>
            {Object.entries(SKILLS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !list.length ? (
          <EmptyState title="Không có nhân viên phù hợp" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Liên hệ</th>
                  <th>Kỹ năng</th>
                  <th>Tài khoản</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className={s.active ? '' : 'row-muted'}>
                    <td>
                      <strong>{s.fullName}</strong>
                      {s.note && <div className="small muted">{s.note}</div>}
                    </td>
                    <td>
                      {s.phone}
                      <div className="small muted">{s.email}</div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        {s.skills.map((k) => (
                          <span key={k} className="badge badge-info">
                            {SKILLS[k]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="small">{s.accountEmail ?? <span className="muted">Chưa có</span>}</td>
                    <td>{s.active ? <Badge tone="ok">Hoạt động</Badge> : <Badge>Ngừng</Badge>}</td>
                    <td className="r nowrap">
                      {isAdmin && (
                        <button className="link-btn small" onClick={() => setEdit({ s })}>
                          Sửa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>
          Nhân viên ngừng hoạt động không xuất hiện trong gợi ý phân công nhưng lịch sử vẫn được giữ.
        </p>
      </div>
      {edit && (
        <StaffForm
          s={edit.s}
          onClose={() => setEdit(null)}
          onSaved={(m) => {
            setEdit(null)
            setMsg(`Đã lưu nhân viên ${m.fullName}.`)
            reload()
          }}
        />
      )}
    </>
  )
}
