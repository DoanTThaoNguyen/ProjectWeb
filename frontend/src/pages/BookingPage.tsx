import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError, errorMessage } from '../api/client'
import { useApi } from '../api/useApi'
import type { Addon, BookingDetail, Estimate, MenuSummary, PartyService, PublicConfig } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert, ErrorState, Field, Img, PageHeader, Spinner } from '../components/ui'
import { date, money, PHONE_RE, toDateInput } from '../utils/format'

const DRAFT_KEY = 'tiecnha.bookingDraft'
const STEPS = ['Thực đơn', 'Thời gian & địa điểm', 'Dịch vụ thêm & liên hệ', 'Xác nhận']

interface Draft {
  serviceId: number | null
  menuId: number | null
  day: string
  startTime: string
  endTime: string
  address: string
  guestCount: string
  tableCount: string
  addons: Record<number, number>
  contactName: string
  contactPhone: string
  budget: string
  note: string
}

const EMPTY: Draft = {
  serviceId: null,
  menuId: null,
  day: '',
  startTime: '11:00',
  endTime: '14:00',
  address: '',
  guestCount: '',
  tableCount: '',
  addons: {},
  contactName: '',
  contactPhone: '',
  budget: '',
  note: '',
}

function loadDraft(): Draft {
  try {
    const s = sessionStorage.getItem(DRAFT_KEY)
    return s ? { ...EMPTY, ...JSON.parse(s) } : EMPTY
  } catch {
    return EMPTY
  }
}

type Errors = Partial<Record<keyof Draft | 'form', string>>

export default function BookingPage() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const services = useApi<PartyService[]>('/api/public/services')
  const menus = useApi<MenuSummary[]>('/api/public/menus')
  const addons = useApi<Addon[]>('/api/public/addons')
  const config = useApi<PublicConfig>('/api/public/config')

  const [d, setD] = useState<Draft>(loadDraft)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [estError, setEstError] = useState<string | null>(null)
  const [estLoading, setEstLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<BookingDetail | null>(null)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => ({ ...p, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  // Luu nhap (de khong mat khi phai dang nhap)
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    } catch {
      /* ignore */
    }
  }, [d])

  // Chon san tu URL (?menu=slug | ?service=CODE)
  useEffect(() => {
    if (!menus.data || !services.data) return
    const slug = params.get('menu')
    const code = params.get('service')
    if (slug) {
      const m = menus.data.find((x) => x.slug === slug)
      if (m) setD((p) => ({ ...p, menuId: m.id, serviceId: m.serviceId }))
    } else if (code) {
      const s = services.data.find((x) => x.code === code)
      if (s) setD((p) => (p.serviceId === s.id ? p : { ...p, serviceId: s.id, menuId: null }))
    }
  }, [menus.data, services.data, params])

  // Dien san thong tin lien he tu tai khoan
  useEffect(() => {
    if (user)
      setD((p) => ({
        ...p,
        contactName: p.contactName || user.fullName,
        contactPhone: p.contactPhone || user.phone || '',
        address: p.address || user.address || '',
      }))
  }, [user])

  const service = services.data?.find((s) => s.id === d.serviceId) ?? null
  const menu = menus.data?.find((m) => m.id === d.menuId) ?? null
  const menuOptions = (menus.data ?? []).filter((m) => m.serviceId === d.serviceId)
  const byTable = menu?.priceUnit === 'TABLE'
  const guests = parseInt(d.guestCount, 10)
  const minTables = menu && byTable && guests > 0 ? Math.max(Math.ceil(guests / (menu.guestsPerTable ?? 10)), menu.minQuantity) : 0

  // Tam tinh tu backend (debounce)
  const addonList = useMemo(
    () => Object.entries(d.addons).map(([id, q]) => ({ addonId: Number(id), quantity: q })),
    [d.addons],
  )
  useEffect(() => {
    if (!menu || !(guests > 0)) {
      setEstimate(null)
      setEstError(null)
      return
    }
    const tables = byTable && d.tableCount ? parseInt(d.tableCount, 10) : null
    const c = new AbortController()
    const t = setTimeout(() => {
      setEstLoading(true)
      api<Estimate>('/api/public/estimate', {
        body: { menuId: menu.id, guestCount: guests, tableCount: tables, addons: addonList },
        signal: c.signal,
      })
        .then((e) => {
          setEstimate(e)
          setEstError(null)
        })
        .catch((e) => {
          if ((e as Error).name === 'AbortError') return
          setEstimate(null)
          setEstError(errorMessage(e))
        })
        .finally(() => setEstLoading(false))
    }, 300)
    return () => {
      clearTimeout(t)
      c.abort()
    }
  }, [menu, guests, d.tableCount, byTable, addonList])

  const leadHours = config.data?.minLeadHours ?? 24
  const minDay = toDateInput(new Date(Date.now() + leadHours * 3600_000))

  function startDate(): Date | null {
    if (!d.day || !d.startTime) return null
    return new Date(`${d.day}T${d.startTime}:00`)
  }
  function endDate(): Date | null {
    if (!d.day || !d.endTime) return null
    return new Date(`${d.day}T${d.endTime}:00`)
  }

  function validate(s: number): Errors {
    const e: Errors = {}
    if (s === 0) {
      if (!d.serviceId) e.serviceId = 'Vui lòng chọn hình thức tiệc'
      if (!d.menuId) e.menuId = 'Vui lòng chọn thực đơn'
      else if (menu && !menu.active) e.menuId = 'Thực đơn đã ngừng phục vụ'
    }
    if (s === 1) {
      const st = startDate()
      const en = endDate()
      if (!d.day) e.day = 'Vui lòng chọn ngày tổ chức'
      if (!d.startTime) e.startTime = 'Chọn giờ bắt đầu'
      if (!d.endTime) e.endTime = 'Chọn giờ kết thúc'
      if (st && st.getTime() < Date.now()) e.day = 'Thời gian không được ở quá khứ'
      else if (st && st.getTime() < Date.now() + leadHours * 3600_000) e.day = `Vui lòng đặt trước ít nhất ${leadHours} giờ`
      if (st && en && en <= st) e.endTime = 'Giờ kết thúc phải sau giờ bắt đầu'
      if (st && en && en.getTime() - st.getTime() > 12 * 3600_000) e.endTime = 'Thời lượng tối đa 12 giờ'
      if (!d.address.trim()) e.address = 'Vui lòng nhập địa chỉ tổ chức tiệc'
      if (!(guests > 0)) e.guestCount = 'Số khách phải là số dương'
      else if (service && guests < service.minGuests) e.guestCount = `${service.name} áp dụng từ ${service.minGuests} khách`
      else if (menu && !byTable && guests < menu.minQuantity) e.guestCount = `Thực đơn này áp dụng từ ${menu.minQuantity} khách`
      if (byTable && d.tableCount) {
        const t = parseInt(d.tableCount, 10)
        if (!(t > 0)) e.tableCount = 'Số bàn phải là số dương'
        else if (t < minTables) e.tableCount = `Cần tối thiểu ${minTables} bàn`
      }
    }
    if (s === 2) {
      if (!d.contactName.trim()) e.contactName = 'Vui lòng nhập tên người liên hệ'
      if (!PHONE_RE.test(d.contactPhone.trim())) e.contactPhone = 'Số điện thoại không hợp lệ (VD: 0912345678)'
      if (d.budget && !(Number(d.budget) >= 0)) e.budget = 'Ngân sách không hợp lệ'
    }
    return e
  }

  function next() {
    const e = validate(step)
    setErrors(e)
    if (Object.keys(e).length) return
    if (step === 1 && estError) {
      setErrors({ form: estError })
      return
    }
    setStep((s) => Math.min(s + 1, 3))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit() {
    for (let s = 0; s < 3; s++) {
      const e = validate(s)
      if (Object.keys(e).length) {
        setErrors(e)
        setStep(s)
        return
      }
    }
    setSubmitting(true)
    setErrors({})
    try {
      const b = await api<BookingDetail>('/api/bookings', {
        body: {
          contactName: d.contactName.trim(),
          contactPhone: d.contactPhone.trim(),
          serviceId: d.serviceId,
          menuId: d.menuId,
          startTime: `${d.day}T${d.startTime}:00`,
          endTime: `${d.day}T${d.endTime}:00`,
          address: d.address.trim(),
          guestCount: guests,
          tableCount: byTable && d.tableCount ? parseInt(d.tableCount, 10) : null,
          budget: d.budget ? Number(d.budget) : null,
          addons: addonList,
          note: d.note.trim() || null,
        },
      })
      setCreated(b)
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {
        /* ignore */
      }
      window.scrollTo({ top: 0 })
    } catch (e) {
      const err = e as ApiError
      setErrors({ form: errorMessage(e), ...(err.fields as Errors) })
    } finally {
      setSubmitting(false)
    }
  }

  if (services.loading || menus.loading || addons.loading) return <Spinner />
  if (services.error || menus.error || addons.error)
    return (
      <div className="container section">
        <ErrorState
          message={services.error || menus.error || addons.error || ''}
          onRetry={() => {
            services.reload()
            menus.reload()
            addons.reload()
          }}
        />
      </div>
    )

  if (created) {
    return (
      <>
        <PageHeader title="Đã gửi yêu cầu đặt tiệc" crumbs={[{ label: 'Đặt tiệc' }]} />
        <div className="container section" style={{ maxWidth: 720 }}>
          <div className="card success-box">
            <div className="success-icon">✓</div>
            <h2>Cảm ơn {created.summary.contactName}!</h2>
            <p className="lead" style={{ margin: '0 auto 12px' }}>
              Mã yêu cầu của bạn là <strong>{created.summary.code}</strong>. Điều phối viên sẽ liên hệ số {created.summary.contactPhone} để tư vấn
              và gửi báo giá chính thức.
            </p>
            <p className="muted">Giá tạm tính: {money(created.summary.estimatedTotal)} (chưa phải báo giá xác nhận)</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
              <Link to={`/don-cua-toi/${created.summary.id}`} className="btn btn-primary">
                Xem chi tiết yêu cầu
              </Link>
              <Link to="/thuc-don" className="btn btn-outline">
                Xem thêm thực đơn
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  const notCustomer = user && user.role !== 'CUSTOMER'

  return (
    <>
      <PageHeader title="Đặt tiệc tại nhà" subtitle="Điền thông tin trong 3 phút – chúng tôi gửi báo giá chi tiết sau khi tư vấn." crumbs={[{ label: 'Đặt tiệc' }]} />
      <section className="section-tight">
        <div className="container wizard">
          <div>
            <ol className="wizard-steps">
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''}>
                  <span>
                    {i + 1}. {s}
                  </span>
                </li>
              ))}
            </ol>
            <div className="card wizard-card">
              {errors.form && <Alert tone="danger">{errors.form}</Alert>}

              {step === 0 && (
                <>
                  <h2>Chọn hình thức tiệc</h2>
                  <p className="muted">Mỗi hình thức có thực đơn và cách tính giá riêng.</p>
                  <div className="option-grid">
                    {services.data!.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`option ${d.serviceId === s.id ? 'selected' : ''}`}
                        onClick={() => {
                          set('serviceId', s.id)
                          if (menu && menu.serviceId !== s.id) set('menuId', null)
                        }}
                      >
                        <Img src={s.image ?? undefined} alt="" />
                        <div>
                          <strong>{s.name}</strong>
                          <small>Từ {s.minGuests} khách</small>
                          {s.fromPricePerGuest != null && <span className="price">từ {money(s.fromPricePerGuest)}/khách</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.serviceId && <p className="field-error">{errors.serviceId}</p>}

                  {service && (
                    <>
                      <h2 style={{ marginTop: 24 }}>Chọn thực đơn</h2>
                      <div className="option-grid">
                        {menuOptions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`option ${d.menuId === m.id ? 'selected' : ''}`}
                            onClick={() => set('menuId', m.id)}
                          >
                            <Img src={m.image ?? undefined} alt="" />
                            <div>
                              <strong>{m.name}</strong>
                              <small>{m.summary}</small>
                              <span className="price">
                                {money(m.price)}
                                {m.priceUnit === 'TABLE' ? `/bàn ${m.guestsPerTable} khách` : '/khách'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {menu && (
                        <p className="small">
                          <Link to={`/thuc-don/${menu.slug}`} target="_blank">
                            Xem danh sách món của {menu.name} ↗
                          </Link>
                        </p>
                      )}
                      {errors.menuId && <p className="field-error">{errors.menuId}</p>}
                    </>
                  )}
                </>
              )}

              {step === 1 && (
                <>
                  <h2>Thời gian & địa điểm</h2>
                  <p className="muted">
                    Đặt trước tối thiểu {leadHours} giờ. Đội bếp sẽ đến sớm để chuẩn bị trước giờ khai tiệc.
                  </p>
                  <div className="form-row-3">
                    <Field label="Ngày tổ chức" required error={errors.day}>
                      <input type="date" className="input" min={minDay} value={d.day} onChange={(e) => set('day', e.target.value)} />
                    </Field>
                    <Field label="Giờ bắt đầu" required error={errors.startTime}>
                      <input type="time" className="input" value={d.startTime} onChange={(e) => set('startTime', e.target.value)} />
                    </Field>
                    <Field label="Dự kiến kết thúc" required error={errors.endTime}>
                      <input type="time" className="input" value={d.endTime} onChange={(e) => set('endTime', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Địa chỉ tổ chức" required error={errors.address} hint="Số nhà, đường, phường/xã, quận/huyện">
                    <input
                      className="input"
                      value={d.address}
                      maxLength={255}
                      placeholder="VD: 12 Nguyễn Văn Linh, P. Tân Phong, Q.7, TP.HCM"
                      onChange={(e) => set('address', e.target.value)}
                    />
                  </Field>
                  <div className="form-row">
                    <Field
                      label="Số khách"
                      required
                      error={errors.guestCount}
                      hint={service ? `${service.name}: từ ${service.minGuests} khách` : undefined}
                    >
                      <input
                        type="number"
                        min={1}
                        className="input"
                        inputMode="numeric"
                        value={d.guestCount}
                        onChange={(e) => set('guestCount', e.target.value)}
                      />
                    </Field>
                    {byTable && (
                      <Field
                        label="Số bàn"
                        error={errors.tableCount}
                        hint={minTables ? `Tối thiểu ${minTables} bàn (${menu?.guestsPerTable} khách/bàn). Để trống = tự tính.` : `${menu?.guestsPerTable} khách/bàn`}
                      >
                        <input
                          type="number"
                          min={1}
                          className="input"
                          inputMode="numeric"
                          placeholder={minTables ? String(minTables) : ''}
                          value={d.tableCount}
                          onChange={(e) => set('tableCount', e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                  {estError && <Alert tone="warn">{estError}</Alert>}
                </>
              )}

              {step === 2 && (
                <>
                  <h2>Dịch vụ bổ sung</h2>
                  <p className="muted">Không bắt buộc – chọn thêm để bữa tiệc trọn vẹn hơn.</p>
                  <div className="addon-list">
                    {addons.data!.map((a) => {
                      const on = d.addons[a.id] !== undefined
                      return (
                        <div key={a.id} className={`addon-row ${on ? 'on' : ''}`}>
                          <input
                            type="checkbox"
                            id={`addon-${a.id}`}
                            checked={on}
                            onChange={() => {
                              const n = { ...d.addons }
                              if (on) delete n[a.id]
                              else n[a.id] = 1
                              set('addons', n)
                            }}
                          />
                          <label htmlFor={`addon-${a.id}`} className="grow">
                            <strong>{a.name}</strong>
                            <small>
                              {money(a.price)}/{a.unitLabel}
                              {a.chargeType === 'PER_GUEST' && ' · nhân theo số khách'}
                              {a.chargeType === 'PER_TABLE' && ' · nhân theo số bàn'}
                            </small>
                          </label>
                          {on && a.chargeType === 'FIXED' && (
                            <div className="qty" aria-label="Số lượng">
                              <button type="button" onClick={() => set('addons', { ...d.addons, [a.id]: Math.max(1, d.addons[a.id] - 1) })}>
                                −
                              </button>
                              <span>{d.addons[a.id]}</span>
                              <button type="button" onClick={() => set('addons', { ...d.addons, [a.id]: Math.min(20, d.addons[a.id] + 1) })}>
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <h2 style={{ marginTop: 28 }}>Thông tin liên hệ</h2>
                  <div className="form-row">
                    <Field label="Người liên hệ" required error={errors.contactName}>
                      <input className="input" value={d.contactName} maxLength={120} onChange={(e) => set('contactName', e.target.value)} />
                    </Field>
                    <Field label="Số điện thoại" required error={errors.contactPhone}>
                      <input
                        className="input"
                        type="tel"
                        inputMode="tel"
                        value={d.contactPhone}
                        placeholder="0912345678"
                        onChange={(e) => set('contactPhone', e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Ngân sách dự kiến (đồng)" error={errors.budget} hint="Giúp điều phối viên tư vấn phù hợp – không bắt buộc">
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step={100000}
                      value={d.budget}
                      onChange={(e) => set('budget', e.target.value)}
                    />
                  </Field>
                  <Field label="Ghi chú" hint="Dịp tổ chức, món kiêng, số người ăn chay, không gian bếp…">
                    <textarea className="input" maxLength={1000} value={d.note} onChange={(e) => set('note', e.target.value)} />
                  </Field>
                </>
              )}

              {step === 3 && (
                <>
                  <h2>Xác nhận thông tin</h2>
                  <p className="muted">Kiểm tra lại trước khi gửi. Bạn có thể quay lại để chỉnh sửa.</p>
                  <dl className="review-list">
                    <dt>Hình thức</dt>
                    <dd>{service?.name}</dd>
                    <dt>Thực đơn</dt>
                    <dd>{menu?.name}</dd>
                    <dt>Thời gian</dt>
                    <dd>
                      {d.startTime} – {d.endTime}, {date(d.day)}
                    </dd>
                    <dt>Địa chỉ</dt>
                    <dd>{d.address}</dd>
                    <dt>Số khách</dt>
                    <dd>
                      {guests} khách{estimate?.tableCount ? ` · ${estimate.tableCount} bàn` : ''}
                    </dd>
                    <dt>Dịch vụ thêm</dt>
                    <dd>
                      {addonList.length
                        ? addonList.map((a) => addons.data!.find((x) => x.id === a.addonId)?.name).join(', ')
                        : 'Không'}
                    </dd>
                    <dt>Liên hệ</dt>
                    <dd>
                      {d.contactName} · {d.contactPhone}
                    </dd>
                    {d.budget && (
                      <>
                        <dt>Ngân sách</dt>
                        <dd>{money(Number(d.budget))}</dd>
                      </>
                    )}
                    {d.note && (
                      <>
                        <dt>Ghi chú</dt>
                        <dd style={{ fontWeight: 400 }}>{d.note}</dd>
                      </>
                    )}
                  </dl>
                  {!user && (
                    <Alert tone="info">
                      Vui lòng <strong>đăng nhập</strong> hoặc <strong>tạo tài khoản</strong> để gửi yêu cầu. Thông tin bạn đã nhập được giữ nguyên.
                      <div className="row" style={{ marginTop: 10 }}>
                        <Link to="/dang-nhap" state={{ from: '/dat-tiec' }} className="btn btn-primary btn-sm">
                          Đăng nhập
                        </Link>
                        <Link to="/dang-ky" state={{ from: '/dat-tiec' }} className="btn btn-outline btn-sm">
                          Tạo tài khoản
                        </Link>
                      </div>
                    </Alert>
                  )}
                  {notCustomer && <Alert tone="warn">Bạn đang đăng nhập tài khoản nội bộ. Chỉ tài khoản khách hàng được gửi yêu cầu đặt tiệc.</Alert>}
                </>
              )}

              <div className="wizard-nav">
                {step > 0 ? (
                  <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                    ← Quay lại
                  </button>
                ) : (
                  <span />
                )}
                {step < 3 ? (
                  <button className="btn btn-primary" onClick={next}>
                    Tiếp tục →
                  </button>
                ) : (
                  <button className="btn btn-primary btn-lg" onClick={submit} disabled={!user || !!notCustomer || submitting}>
                    {submitting ? 'Đang gửi…' : 'Gửi yêu cầu đặt tiệc'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="card summary-card">
            {menu ? <Img className="summary-img" src={menu.image ?? undefined} alt={menu.name} /> : null}
            <div className="summary-body">
              <h3 style={{ marginBottom: 2 }}>{menu ? menu.name : 'Chưa chọn thực đơn'}</h3>
              <p className="muted small" style={{ margin: 0 }}>
                {service?.name ?? 'Chọn hình thức tiệc để bắt đầu'}
              </p>
              {estLoading && !estimate && <Spinner label="Đang tính…" />}
              {estimate ? (
                <>
                  <ul className="summary-lines">
                    {estimate.lines.map((l, i) => (
                      <li key={i}>
                        <span>
                          {l.description}
                          <br />
                          <small className="muted">
                            {l.quantity} {l.unit} × {money(l.unitPrice)}
                          </small>
                        </span>
                        <span>{money(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="summary-total">
                    <span>Tạm tính</span>
                    <strong>{money(estimate.total)}</strong>
                  </div>
                </>
              ) : (
                !estLoading && <p className="small muted" style={{ marginTop: 14 }}>Nhập số khách để xem giá tạm tính.</p>
              )}
              <p className="disclaimer">
                <strong>Đây chưa phải báo giá xác nhận.</strong> Giá chính thức (gồm phí di chuyển, nhân sự…) được gửi trong báo giá sau khi tư vấn.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
