import { useEffect, useState } from 'react'
import { api, ApiError, errorMessage } from '../../api/client'
import { useApi } from '../../api/useApi'
import type { AuditRow, Page, Role, Setting, UserRow } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { AdminHeader } from '../../components/AdminLayout'
import { Alert, Badge, EmptyState, ErrorState, Field, Modal, Pagination, Spinner } from '../../components/ui'
import { dateShort, dateTime, PHONE_RE } from '../../utils/format'
import { ROLE_LABEL, SETTING_LABEL } from '../../utils/labels'

const ROLES: Role[] = ['CUSTOMER', 'COORDINATOR', 'STAFF', 'ADMIN']

function UserForm({ u, onClose, onSaved }: { u: UserRow | null; onClose: () => void; onSaved: (r: UserRow) => void }) {
  const { user: me } = useAuth()
  const [f, setF] = useState({ email: u?.email ?? '', fullName: u?.fullName ?? '', phone: u?.phone ?? '', role: (u?.role ?? 'COORDINATOR') as Role, active: u?.active ?? true, password: '' })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const self = u?.id === me?.id

  async function save() {
    const e: Record<string, string> = {}
    if (!u && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Email không hợp lệ'
    if (!f.fullName.trim()) e.fullName = 'Nhập họ tên'
    if (f.phone && !PHONE_RE.test(f.phone)) e.phone = 'Số điện thoại không hợp lệ'
    if ((!u || f.password) && f.password.length < 8) e.password = 'Mật khẩu từ 8 ký tự'
    setErrs(e)
    if (Object.keys(e).length) return
    setBusy(true)
    setErr(null)
    try {
      const r = u
        ? await api<UserRow>(`/api/admin/users/${u.id}`, {
            method: 'PUT',
            body: { fullName: f.fullName, phone: f.phone || null, role: f.role, active: f.active, newPassword: f.password || null },
          })
        : await api<UserRow>('/api/admin/users', { body: { email: f.email, fullName: f.fullName, phone: f.phone || null, role: f.role, password: f.password } })
      onSaved(r)
    } catch (x) {
      setErr(errorMessage(x))
      if (x instanceof ApiError && x.fields) setErrs(x.fields)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={u ? `Sửa tài khoản – ${u.email}` : 'Tạo tài khoản nội bộ'} onClose={onClose} busy={busy}>
      <div className="stack">
        {!u && (
          <Field label="Email" required error={errs.email}>
            <input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
        )}
        <div className="form-row">
          <Field label="Họ tên" required error={errs.fullName}>
            <input className="input" maxLength={120} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
          </Field>
          <Field label="Số điện thoại" error={errs.phone}>
            <input className="input" maxLength={12} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </div>
        <Field label="Vai trò" required hint={self ? 'Không thể tự đổi vai trò của mình' : f.role === 'STAFF' ? 'Hồ sơ nhân viên sẽ được tạo nếu chưa có' : undefined}>
          <select className="input" value={f.role} disabled={self} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={u ? 'Đặt lại mật khẩu' : 'Mật khẩu'} required={!u} error={errs.password} hint={u ? 'Để trống nếu không đổi' : undefined}>
          <input className="input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        {u && (
          <label className="check">
            <input type="checkbox" disabled={self} checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Cho phép đăng nhập (bỏ chọn = khóa tài khoản)
          </label>
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

export function UsersPage() {
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(0)
  const [edit, setEdit] = useState<{ u: UserRow | null } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => {
      setDq(q.trim())
      setPage(0)
    }, 350)
    return () => clearTimeout(t)
  }, [q])
  const qs = new URLSearchParams({ page: String(page), size: '12' })
  if (dq) qs.set('q', dq)
  if (role) qs.set('role', role)
  const { data, loading, error, reload } = useApi<Page<UserRow>>(`/api/admin/users?${qs}`)

  return (
    <>
      <AdminHeader
        title="Tài khoản"
        subtitle="Đăng ký công khai chỉ tạo khách hàng. Tài khoản nội bộ do quản trị tạo."
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setEdit({ u: null })}>
            + Tạo tài khoản
          </button>
        }
      />
      {msg && <Alert tone="ok">{msg}</Alert>}
      <div className="card card-pad">
        <div className="filters-row">
          <input className="input" placeholder="Tìm tên, email, SĐT…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '2 1 200px' }} />
          <select
            className="input"
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              setPage(0)
            }}
            style={{ flex: '1 1 160px' }}
            aria-label="Vai trò"
          >
            <option value="">Mọi vai trò</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.items.length ? (
          <EmptyState title="Không có tài khoản phù hợp" />
        ) : (
          <>
            <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th>Email / SĐT</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id} className={u.active ? '' : 'row-muted'}>
                      <td>
                        <strong>{u.fullName}</strong>
                      </td>
                      <td>
                        {u.email}
                        <div className="small muted">{u.phone}</div>
                      </td>
                      <td>
                        <Badge tone={u.role === 'ADMIN' ? 'danger' : u.role === 'CUSTOMER' ? 'muted' : 'info'}>{ROLE_LABEL[u.role]}</Badge>
                      </td>
                      <td>{u.active ? <Badge tone="ok">Hoạt động</Badge> : <Badge tone="danger">Đã khóa</Badge>}</td>
                      <td>{dateShort(u.createdAt)}</td>
                      <td className="r">
                        <button className="link-btn small" onClick={() => setEdit({ u })}>
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onPage={setPage} />
          </>
        )}
      </div>
      {edit && (
        <UserForm
          u={edit.u}
          onClose={() => setEdit(null)}
          onSaved={(r) => {
            setEdit(null)
            setMsg(`Đã lưu tài khoản ${r.email}.`)
            reload()
          }}
        />
      )}
    </>
  )
}

function SettingRow({ s, onSaved }: { s: Setting; onSaved: (all: Setting[]) => void }) {
  const [v, setV] = useState(s.value)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const meta = SETTING_LABEL[s.key]
  return (
    <tr>
      <td>
        <strong>{meta?.label ?? s.key}</strong>
        <div className="small muted">{s.key}</div>
      </td>
      <td>
        <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <input className="input input-sm" style={{ width: 100 }} type="number" min={0} value={v} onChange={(e) => setV(e.target.value)} />
          <span className="small muted">{meta?.unit}</span>
        </div>
        {err && <div className="field-error">{err}</div>}
      </td>
      <td className="r">
        <button
          className="btn btn-outline btn-sm"
          disabled={busy || v === s.value}
          onClick={async () => {
            setBusy(true)
            setErr(null)
            try {
              onSaved(await api<Setting[]>(`/api/admin/settings/${s.key}`, { method: 'PUT', body: { value: v } }))
            } catch (e) {
              setErr(errorMessage(e))
            } finally {
              setBusy(false)
            }
          }}
        >
          Lưu
        </button>
      </td>
    </tr>
  )
}

export function SettingsPage() {
  const settings = useApi<Setting[]>('/api/admin/settings')
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => {
      setDq(q.trim())
      setPage(0)
    }, 350)
    return () => clearTimeout(t)
  }, [q])
  const audit = useApi<Page<AuditRow>>(`/api/admin/audit?page=${page}&size=15${dq ? `&q=${encodeURIComponent(dq)}` : ''}`)

  return (
    <>
      <AdminHeader title="Cấu hình & nhật ký" subtitle="Thông số demo dùng cho tính ca làm, cọc, báo giá và lịch sử thao tác." />
      {msg && <Alert tone="ok">{msg}</Alert>}
      <div className="card card-pad">
        <h2>Cấu hình</h2>
        {settings.loading && !settings.data ? (
          <Spinner />
        ) : settings.error ? (
          <ErrorState message={settings.error} onRetry={settings.reload} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {(settings.data ?? []).map((s) => (
                  <SettingRow
                    key={s.key + s.value}
                    s={s}
                    onSaved={(all) => {
                      settings.setData(all)
                      setMsg('Đã lưu cấu hình. Áp dụng cho báo giá/phân công tạo sau thời điểm này.')
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <div className="section-bar">
          <h2>Nhật ký thao tác</h2>
          <input className="input input-sm" placeholder="Lọc theo thao tác, email, nội dung…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
        </div>
        {audit.loading && !audit.data ? (
          <Spinner />
        ) : audit.error ? (
          <ErrorState message={audit.error} onRetry={audit.reload} />
        ) : !audit.data?.items.length ? (
          <EmptyState title="Chưa có thao tác nào" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Thời điểm</th>
                    <th>Người thực hiện</th>
                    <th>Thao tác</th>
                    <th>Đối tượng</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data.items.map((a) => (
                    <tr key={a.id}>
                      <td className="nowrap small">{dateTime(a.createdAt)}</td>
                      <td className="small">
                        {a.actorName ?? 'Hệ thống'}
                        <div className="muted">{a.actorEmail}</div>
                      </td>
                      <td>
                        <code className="code">{a.action}</code>
                      </td>
                      <td className="small">
                        {a.entity}
                        {a.entityId ? ` #${a.entityId}` : ''}
                      </td>
                      <td className="small">{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={audit.data.page} totalPages={audit.data.totalPages} totalItems={audit.data.totalItems} onPage={setPage} />
          </>
        )}
      </div>
    </>
  )
}
