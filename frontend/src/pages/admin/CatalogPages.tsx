import { useEffect, useState } from 'react'
import { api, ApiError, errorMessage } from '../../api/client'
import { useApi } from '../../api/useApi'
import type { Addon, ChargeType, Dish, DishCategory, MenuDetail, MenuSummary, PartyService, PriceUnit } from '../../api/types'
import { AdminHeader } from '../../components/AdminLayout'
import { Alert, Badge, EmptyState, ErrorState, Field, Img, Modal, Spinner } from '../../components/ui'
import { money, priceUnitLabel } from '../../utils/format'
import { CHARGE_TYPE } from '../../utils/labels'

function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="ok">Đang bán</Badge> : <Badge>Ngừng</Badge>
}

/** Hook luu form chung: goi API, gom loi tung truong. */
function useSaver<T>() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  async function save(fn: () => Promise<T>, done: (r: T) => void) {
    setBusy(true)
    setErr(null)
    setFields({})
    try {
      done(await fn())
    } catch (e) {
      setErr(errorMessage(e))
      if (e instanceof ApiError && e.fields) setFields(e.fields)
    } finally {
      setBusy(false)
    }
  }
  return { busy, err, fields, save }
}

// ================= Thuc don =================

type MenuForm = {
  serviceId: number | ''
  name: string
  slug: string
  summary: string
  description: string
  image: string
  price: number | ''
  priceUnit: PriceUnit
  guestsPerTable: number | ''
  minQuantity: number
  featured: boolean
  active: boolean
  dishIds: number[]
}

function MenuEditor({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: () => void }) {
  const services = useApi<PartyService[]>('/api/admin/services')
  const dishes = useApi<Dish[]>('/api/admin/dishes')
  const [f, setF] = useState<MenuForm | null>(
    id
      ? null
      : {
          serviceId: '',
          name: '',
          slug: '',
          summary: '',
          description: '',
          image: '',
          price: '',
          priceUnit: 'GUEST',
          guestsPerTable: '',
          minQuantity: 1,
          featured: false,
          active: true,
          dishIds: [],
        },
  )
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [dq, setDq] = useState('')
  const s = useSaver<MenuDetail>()

  useEffect(() => {
    if (!id) return
    api<MenuDetail>(`/api/admin/menus/${id}`)
      .then((d) =>
        setF({
          serviceId: d.menu.serviceId,
          name: d.menu.name,
          slug: d.menu.slug,
          summary: d.menu.summary ?? '',
          description: d.description ?? '',
          image: d.menu.image ?? '',
          price: Number(d.menu.price),
          priceUnit: d.menu.priceUnit,
          guestsPerTable: d.menu.guestsPerTable ?? '',
          minQuantity: d.menu.minQuantity,
          featured: d.menu.featured,
          active: d.menu.active,
          dishIds: d.dishIds,
        }),
      )
      .catch((e) => setLoadErr(errorMessage(e)))
  }, [id])

  function submit() {
    if (!f) return
    const local: Record<string, string> = {}
    if (!f.serviceId) local.serviceId = 'Chọn hình thức tiệc'
    if (!f.name.trim()) local.name = 'Nhập tên thực đơn'
    if (f.price === '' || Number(f.price) < 0) local.price = 'Giá không hợp lệ'
    if (f.priceUnit === 'TABLE' && !(Number(f.guestsPerTable) > 0)) local.guestsPerTable = 'Nhập số khách/bàn'
    if (Object.keys(local).length) {
      setLocalErr({ ...local })
      return
    }
    setLocalErr({})
    const body = { ...f, slug: f.slug || null, guestsPerTable: f.priceUnit === 'TABLE' ? Number(f.guestsPerTable) : null, price: Number(f.price) }
    s.save(
      () => (id ? api<MenuDetail>(`/api/admin/menus/${id}`, { method: 'PUT', body }) : api<MenuDetail>('/api/admin/menus', { body })),
      () => onSaved(),
    )
  }
  const [localErr, setLocalErr] = useState<Record<string, string>>({})
  const fe = { ...s.fields, ...localErr }

  return (
    <Modal title={id ? 'Sửa thực đơn' : 'Thêm thực đơn'} onClose={onClose} wide busy={s.busy}>
      {loadErr ? (
        <Alert tone="danger">{loadErr}</Alert>
      ) : !f ? (
        <Spinner />
      ) : (
        <div className="stack">
          <div className="form-row">
            <Field label="Tên thực đơn" required error={fe.name}>
              <input className="input" maxLength={150} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Hình thức tiệc" required error={fe.serviceId}>
              <select className="input" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">— Chọn —</option>
                {(services.data ?? []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-row-3">
            <Field label="Giá (đ)" required error={fe.price} hint="Đổi giá không ảnh hưởng đơn/báo giá cũ">
              <input type="number" min={0} step={1000} className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value === '' ? '' : Number(e.target.value) })} />
            </Field>
            <Field label="Đơn vị tính" required>
              <select className="input" value={f.priceUnit} onChange={(e) => setF({ ...f, priceUnit: e.target.value as PriceUnit })}>
                <option value="GUEST">Theo khách</option>
                <option value="TABLE">Theo bàn</option>
              </select>
            </Field>
            {f.priceUnit === 'TABLE' ? (
              <Field label="Số khách tiêu chuẩn/bàn" required error={fe.guestsPerTable}>
                <input type="number" min={1} className="input" value={f.guestsPerTable} onChange={(e) => setF({ ...f, guestsPerTable: e.target.value === '' ? '' : Number(e.target.value) })} />
              </Field>
            ) : (
              <Field label="Số khách tối thiểu" error={fe.minQuantity}>
                <input type="number" min={1} className="input" value={f.minQuantity} onChange={(e) => setF({ ...f, minQuantity: Number(e.target.value) || 1 })} />
              </Field>
            )}
          </div>
          {f.priceUnit === 'TABLE' && (
            <Field label="Số bàn tối thiểu">
              <input type="number" min={1} className="input" value={f.minQuantity} onChange={(e) => setF({ ...f, minQuantity: Number(e.target.value) || 1 })} />
            </Field>
          )}
          <Field label="Mô tả ngắn">
            <input className="input" maxLength={255} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
          </Field>
          <Field label="Mô tả chi tiết">
            <textarea className="input" rows={3} maxLength={5000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <div className="form-row">
            <Field label="Ảnh" hint="Đường dẫn trong repo, ví dụ /images/menus/ten-anh.jpg" error={fe.image}>
              <input className="input" maxLength={255} value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} />
            </Field>
            <Field label="Slug (đường dẫn)" hint="Để trống để tự tạo từ tên" error={fe.slug}>
              <input className="input" maxLength={160} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
            </Field>
          </div>
          <div className="row">
            <label className="check">
              <input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Nổi bật trên trang chủ
            </label>
            <label className="check">
              <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Đang phục vụ (bỏ chọn = ngừng, khách không đặt được)
            </label>
          </div>
          <Field label={`Món trong thực đơn (${f.dishIds.length})`}>
            <input className="input input-sm" placeholder="Lọc món…" value={dq} onChange={(e) => setDq(e.target.value)} style={{ marginBottom: 8 }} />
            {dishes.loading ? (
              <Spinner />
            ) : (
              <div className="dish-pick">
                {(dishes.data ?? [])
                  .filter((d) => !dq || d.name.toLowerCase().includes(dq.toLowerCase()) || f.dishIds.includes(d.id))
                  .map((d) => (
                    <label key={d.id} className={`check ${d.active ? '' : 'muted'}`}>
                      <input
                        type="checkbox"
                        checked={f.dishIds.includes(d.id)}
                        onChange={(e) => setF({ ...f, dishIds: e.target.checked ? [...f.dishIds, d.id] : f.dishIds.filter((x) => x !== d.id) })}
                      />
                      {d.name} <span className="small muted">· {d.categoryName}</span>
                    </label>
                  ))}
              </div>
            )}
          </Field>
          {s.err && <Alert tone="danger">{s.err}</Alert>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose} disabled={s.busy}>
              Hủy
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={s.busy}>
              {s.busy ? 'Đang lưu…' : 'Lưu thực đơn'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function MenusAdminPage() {
  const { data, loading, error, reload } = useApi<MenuSummary[]>('/api/admin/menus')
  const [edit, setEdit] = useState<{ id: number | null } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [svc, setSvc] = useState('')
  const list = (data ?? []).filter((m) => (!svc || m.serviceCode === svc) && (!q || m.name.toLowerCase().includes(q.toLowerCase())))
  const svcs = Array.from(new Map((data ?? []).map((m) => [m.serviceCode, m.serviceName])).entries())

  return (
    <>
      <AdminHeader
        title="Thực đơn"
        subtitle="Giá, đơn vị tính, món ăn. Ngừng phục vụ thay vì xóa để giữ lịch sử đơn."
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setEdit({ id: null })}>
            + Thêm thực đơn
          </button>
        }
      />
      {msg && <Alert tone="ok">{msg}</Alert>}
      <div className="card card-pad">
        <div className="filters-row">
          <input className="input" placeholder="Tìm tên thực đơn…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '2 1 200px' }} />
          <select className="input" value={svc} onChange={(e) => setSvc(e.target.value)} style={{ flex: '1 1 160px' }} aria-label="Hình thức">
            <option value="">Mọi hình thức</option>
            {svcs.map(([k, v]) => (
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
          <EmptyState title="Không có thực đơn" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Thực đơn</th>
                  <th>Hình thức</th>
                  <th className="r">Giá</th>
                  <th className="r">Quy đổi/khách</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className={m.active ? '' : 'row-muted'}>
                    <td>
                      <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                        <Img src={m.image ?? undefined} alt="" className="thumb" />
                        <div>
                          <strong>{m.name}</strong> {m.featured && <Badge tone="warn">Nổi bật</Badge>}
                          <div className="small muted">/{m.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>{m.serviceName}</td>
                    <td className="r nowrap">
                      {money(m.price)}
                      <div className="small muted">{priceUnitLabel(m.priceUnit, m.guestsPerTable)}</div>
                    </td>
                    <td className="r">{money(m.pricePerGuest)}</td>
                    <td>
                      <ActiveBadge active={m.active} />
                    </td>
                    <td className="r">
                      <button className="link-btn small" onClick={() => setEdit({ id: m.id })}>
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {edit && (
        <MenuEditor
          id={edit.id}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null)
            setMsg('Đã lưu thực đơn.')
            reload()
          }}
        />
      )}
    </>
  )
}

// ================= Mon an & danh muc =================

export function DishesAdminPage() {
  const dishes = useApi<Dish[]>('/api/admin/dishes')
  const cats = useApi<DishCategory[]>('/api/admin/categories')
  const [edit, setEdit] = useState<{ d: Dish | null } | null>(null)
  const [catEdit, setCatEdit] = useState<{ c: DishCategory | null } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const list = (dishes.data ?? []).filter((d) => (!cat || String(d.categoryId) === cat) && (!q || d.name.toLowerCase().includes(q.toLowerCase())))

  return (
    <>
      <AdminHeader
        title="Món ăn"
        subtitle="Danh mục món và món dùng để ghép thực đơn."
        actions={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setCatEdit({ c: null })}>
              + Danh mục
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setEdit({ d: null })}>
              + Thêm món
            </button>
          </>
        }
      />
      {msg && <Alert tone="ok">{msg}</Alert>}
      <div className="admin-split">
        <div className="card card-pad">
          <h3>Danh mục</h3>
          {cats.loading && !cats.data ? (
            <Spinner />
          ) : cats.error ? (
            <ErrorState message={cats.error} onRetry={cats.reload} />
          ) : (
            <ul className="plain-list">
              <li>
                <button className={`list-btn ${cat === '' ? 'active' : ''}`} onClick={() => setCat('')}>
                  Tất cả <span className="muted">{dishes.data?.length ?? ''}</span>
                </button>
              </li>
              {(cats.data ?? []).map((c) => (
                <li key={c.id}>
                  <button className={`list-btn ${cat === String(c.id) ? 'active' : ''}`} onClick={() => setCat(String(c.id))}>
                    {c.name} {!c.active && <Badge>Ngừng</Badge>} <span className="muted">{c.dishCount}</span>
                  </button>
                  <button className="link-btn small" onClick={() => setCatEdit({ c })} aria-label={`Sửa ${c.name}`}>
                    Sửa
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card card-pad">
          <div className="filters-row">
            <input className="input" placeholder="Tìm món…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {dishes.loading && !dishes.data ? (
            <Spinner />
          ) : dishes.error ? (
            <ErrorState message={dishes.error} onRetry={dishes.reload} />
          ) : !list.length ? (
            <EmptyState title="Không có món" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Món</th>
                    <th>Danh mục</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => (
                    <tr key={d.id} className={d.active ? '' : 'row-muted'}>
                      <td>
                        <strong>{d.name}</strong>
                        {d.description && <div className="small muted">{d.description}</div>}
                      </td>
                      <td>{d.categoryName}</td>
                      <td>{d.active ? <Badge tone="ok">Dùng</Badge> : <Badge>Ngừng</Badge>}</td>
                      <td className="r">
                        <button className="link-btn small" onClick={() => setEdit({ d })}>
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {edit && (
        <DishEditor
          d={edit.d}
          cats={cats.data ?? []}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null)
            setMsg('Đã lưu món.')
            dishes.reload()
            cats.reload()
          }}
        />
      )}
      {catEdit && (
        <CategoryEditor
          c={catEdit.c}
          onClose={() => setCatEdit(null)}
          onSaved={() => {
            setCatEdit(null)
            setMsg('Đã lưu danh mục.')
            cats.reload()
            dishes.reload()
          }}
        />
      )}
    </>
  )
}

function DishEditor({ d, cats, onClose, onSaved }: { d: Dish | null; cats: DishCategory[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ categoryId: d?.categoryId ?? cats[0]?.id ?? 0, name: d?.name ?? '', description: d?.description ?? '', image: d?.image ?? '', active: d?.active ?? true })
  const s = useSaver<Dish>()
  return (
    <Modal title={d ? 'Sửa món' : 'Thêm món'} onClose={onClose} busy={s.busy}>
      <div className="stack">
        <Field label="Tên món" required error={s.fields.name}>
          <input className="input" maxLength={150} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Danh mục" required error={s.fields.categoryId}>
          <select className="input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: Number(e.target.value) })}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mô tả">
          <input className="input" maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Đang dùng
        </label>
        {s.err && <Alert tone="danger">{s.err}</Alert>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={s.busy}>
            Hủy
          </button>
          <button
            className="btn btn-primary"
            disabled={s.busy}
            onClick={() => {
              const body = { ...f, description: f.description || null, image: f.image || null }
              s.save(() => (d ? api<Dish>(`/api/admin/dishes/${d.id}`, { method: 'PUT', body }) : api<Dish>('/api/admin/dishes', { body })), onSaved)
            }}
          >
            Lưu
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CategoryEditor({ c, onClose, onSaved }: { c: DishCategory | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: c?.name ?? '', sortOrder: c?.sortOrder ?? 0, active: c?.active ?? true })
  const s = useSaver<DishCategory>()
  return (
    <Modal title={c ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={onClose} busy={s.busy}>
      <div className="stack">
        <Field label="Tên danh mục" required error={s.fields.name}>
          <input className="input" maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Thứ tự hiển thị">
          <input type="number" className="input" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) || 0 })} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Đang dùng
        </label>
        {s.err && <Alert tone="danger">{s.err}</Alert>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={s.busy}>
            Hủy
          </button>
          <button
            className="btn btn-primary"
            disabled={s.busy}
            onClick={() =>
              s.save(() => (c ? api<DishCategory>(`/api/admin/categories/${c.id}`, { method: 'PUT', body: f }) : api<DishCategory>('/api/admin/categories', { body: f })), onSaved)
            }
          >
            Lưu
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ================= Dich vu bo sung & hinh thuc tiec =================

export function AddonsAdminPage() {
  const addons = useApi<Addon[]>('/api/admin/addons')
  const services = useApi<PartyService[]>('/api/admin/services')
  const [edit, setEdit] = useState<{ a: Addon | null } | null>(null)
  const [svcEdit, setSvcEdit] = useState<PartyService | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <>
      <AdminHeader title="Dịch vụ & hình thức tiệc" subtitle="Dịch vụ bổ sung khách chọn khi đặt và các hình thức tiệc." />
      {msg && <Alert tone="ok">{msg}</Alert>}
      <div className="card card-pad">
        <div className="section-bar">
          <h2>Dịch vụ bổ sung</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setEdit({ a: null })}>
            + Thêm dịch vụ
          </button>
        </div>
        {addons.loading && !addons.data ? (
          <Spinner />
        ) : addons.error ? (
          <ErrorState message={addons.error} onRetry={addons.reload} />
        ) : !addons.data?.length ? (
          <EmptyState title="Chưa có dịch vụ bổ sung" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th>Cách tính</th>
                  <th className="r">Giá</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {addons.data.map((a) => (
                  <tr key={a.id} className={a.active ? '' : 'row-muted'}>
                    <td>
                      <strong>{a.name}</strong>
                      {a.description && <div className="small muted">{a.description}</div>}
                    </td>
                    <td>{CHARGE_TYPE[a.chargeType]}</td>
                    <td className="r nowrap">
                      {money(a.price)}/{a.unitLabel}
                    </td>
                    <td>
                      <ActiveBadge active={a.active} />
                    </td>
                    <td className="r">
                      <button className="link-btn small" onClick={() => setEdit({ a })}>
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h2>Hình thức tiệc</h2>
        {services.loading && !services.data ? (
          <Spinner />
        ) : services.error ? (
          <ErrorState message={services.error} onRetry={services.reload} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Hình thức</th>
                  <th>Khách tối thiểu</th>
                  <th>Thực đơn đang bán</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(services.data ?? []).map((x) => (
                  <tr key={x.id} className={x.active ? '' : 'row-muted'}>
                    <td>
                      <strong>{x.name}</strong>
                      <div className="small muted">{x.tagline}</div>
                    </td>
                    <td>{x.minGuests}</td>
                    <td>{x.menuCount}</td>
                    <td>
                      <ActiveBadge active={x.active} />
                    </td>
                    <td className="r">
                      <button className="link-btn small" onClick={() => setSvcEdit(x)}>
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && (
        <AddonEditor
          a={edit.a}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null)
            setMsg('Đã lưu dịch vụ bổ sung.')
            addons.reload()
          }}
        />
      )}
      {svcEdit && (
        <ServiceEditor
          s0={svcEdit}
          onClose={() => setSvcEdit(null)}
          onSaved={() => {
            setSvcEdit(null)
            setMsg('Đã lưu hình thức tiệc.')
            services.reload()
          }}
        />
      )}
    </>
  )
}

function AddonEditor({ a, onClose, onSaved }: { a: Addon | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: a?.name ?? '',
    description: a?.description ?? '',
    price: a ? Number(a.price) : 0,
    chargeType: (a?.chargeType ?? 'FIXED') as ChargeType,
    unitLabel: a?.unitLabel ?? 'gói',
    sortOrder: a?.sortOrder ?? 0,
    active: a?.active ?? true,
  })
  const s = useSaver<Addon>()
  return (
    <Modal title={a ? 'Sửa dịch vụ bổ sung' : 'Thêm dịch vụ bổ sung'} onClose={onClose} busy={s.busy}>
      <div className="stack">
        <Field label="Tên dịch vụ" required error={s.fields.name}>
          <input className="input" maxLength={150} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Mô tả">
          <input className="input" maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="form-row-3">
          <Field label="Giá (đ)" required error={s.fields.price}>
            <input type="number" min={0} step={1000} className="input" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} />
          </Field>
          <Field label="Cách tính" required>
            <select className="input" value={f.chargeType} onChange={(e) => setF({ ...f, chargeType: e.target.value as ChargeType })}>
              {Object.entries(CHARGE_TYPE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Đơn vị" required error={s.fields.unitLabel}>
            <input className="input" maxLength={30} value={f.unitLabel} onChange={(e) => setF({ ...f, unitLabel: e.target.value })} />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Đang cung cấp
        </label>
        {s.err && <Alert tone="danger">{s.err}</Alert>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={s.busy}>
            Hủy
          </button>
          <button
            className="btn btn-primary"
            disabled={s.busy}
            onClick={() => {
              const body = { ...f, description: f.description || null }
              s.save(() => (a ? api<Addon>(`/api/admin/addons/${a.id}`, { method: 'PUT', body }) : api<Addon>('/api/admin/addons', { body })), onSaved)
            }}
          >
            Lưu
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ServiceEditor({ s0, onClose, onSaved }: { s0: PartyService; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: s0.name,
    tagline: s0.tagline ?? '',
    description: s0.description ?? '',
    image: s0.image ?? '',
    minGuests: s0.minGuests,
    active: s0.active,
  })
  const s = useSaver<PartyService>()
  return (
    <Modal title={`Sửa hình thức – ${s0.name}`} onClose={onClose} busy={s.busy}>
      <div className="stack">
        <Field label="Tên" required error={s.fields.name}>
          <input className="input" maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Câu giới thiệu">
          <input className="input" maxLength={255} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} />
        </Field>
        <Field label="Mô tả">
          <textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="form-row">
          <Field label="Số khách tối thiểu" error={s.fields.minGuests}>
            <input type="number" min={1} className="input" value={f.minGuests} onChange={(e) => setF({ ...f, minGuests: Number(e.target.value) || 1 })} />
          </Field>
          <Field label="Ảnh">
            <input className="input" maxLength={255} value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Đang nhận đặt
        </label>
        {s.err && <Alert tone="danger">{s.err}</Alert>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={s.busy}>
            Hủy
          </button>
          <button className="btn btn-primary" disabled={s.busy} onClick={() => s.save(() => api<PartyService>(`/api/admin/services/${s0.id}`, { method: 'PUT', body: f }), onSaved)}>
            Lưu
          </button>
        </div>
      </div>
    </Modal>
  )
}
