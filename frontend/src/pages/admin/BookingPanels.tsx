import { useEffect, useMemo, useState } from 'react'
import { api, ApiError, errorMessage } from '../../api/client'
import { useApi } from '../../api/useApi'
import type {
  AssignmentLite,
  BookingDetail,
  DefaultShift,
  PublicConfig,
  QuoteInput,
  QuoteItemInput,
  ScheduleConflict,
  Skill,
  StaffSuggestion,
} from '../../api/types'
import { Alert, Field, Modal, newIdemKey, Spinner } from '../../components/ui'
import { dateTime, money, toLocalInput } from '../../utils/format'
import { ITEM_TYPE, PAYMENT_METHOD, PAYMENT_TYPE, SKILLS } from '../../utils/labels'

const toInput = (s: string) => s.slice(0, 16)
const fromInput = (s: string) => (s.length === 16 ? s + ':00' : s)

// ---------------- Bao gia ----------------

export function QuoteEditor({
  b,
  draftId,
  onClose,
  onSaved,
}: {
  b: BookingDetail
  draftId: number | null
  onClose: () => void
  onSaved: (d: BookingDetail, sent: boolean) => void
}) {
  const [form, setForm] = useState<QuoteInput | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [customDeposit, setCustomDeposit] = useState(false)
  const cfg = useApi<PublicConfig>("/api/public/config")
  const pct = cfg.data?.depositPercent ?? 30

  useEffect(() => {
    const draft = draftId ? b.quotes.find((q) => q.id === draftId) : null
    const latest = b.quotes[0]
    const base = draft ?? (latest && latest.status !== 'DRAFT' ? latest : null)
    if (base) {
      // Ban moi duoc tao tu ban gan nhat (sao chep), ban da gui khong bi sua
      const today = new Date()
      today.setDate(today.getDate() + 7)
      setForm({
        items: base.items.map((i) => ({ itemType: i.itemType, description: i.description, quantity: Number(i.quantity), unit: i.unit, unitPrice: Number(i.unitPrice) })),
        depositAmount: draft ? Number(base.depositAmount) : null,
        validUntil: draft ? base.validUntil : toLocalInput(today).slice(0, 10),
        notes: base.notes,
        terms: base.terms,
        send: false,
      })
      setCustomDeposit(!!draft)
      return
    }
    api<QuoteInput>(`/api/coord/bookings/${b.summary.id}/quotes/suggest`)
      .then((s) => setForm({ ...s, items: s.items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })) }))
      .catch((e) => setLoadErr(errorMessage(e)))
  }, [b, draftId])

  const preview = useMemo(() => {
    if (!form) return { total: 0, deposit: 0 }
    const total = form.items.reduce((a, i) => a + Math.round((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)) * (i.itemType === 'DISCOUNT' ? -1 : 1), 0)
    return { total, deposit: customDeposit && form.depositAmount != null ? Number(form.depositAmount) : Math.round((total * pct) / 100 / 1000) * 1000 }
  }, [form, customDeposit, pct])

  if (loadErr) {
    return (
      <Modal title="Lập báo giá" onClose={onClose}>
        <Alert tone="danger">{loadErr}</Alert>
      </Modal>
    )
  }

  const upd = (i: number, patch: Partial<QuoteItemInput>) =>
    setForm((f) => (f ? { ...f, items: f.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) } : f))

  async function save(send: boolean) {
    if (!form) return
    const fe: Record<string, string> = {}
    form.items.forEach((it, i) => {
      if (!it.description.trim()) fe[`items[${i}].description`] = 'Nhập mô tả'
      if (!(Number(it.quantity) > 0)) fe[`items[${i}].quantity`] = 'SL > 0'
      if (!(Number(it.unitPrice) >= 0)) fe[`items[${i}].unitPrice`] = 'Đơn giá ≥ 0'
    })
    if (!form.items.length) fe.items = 'Báo giá cần ít nhất một dòng'
    if (!form.validUntil) fe.validUntil = 'Chọn ngày hết hiệu lực'
    if (preview.total <= 0) fe.items = 'Tổng báo giá phải lớn hơn 0'
    if (customDeposit && (form.depositAmount == null || form.depositAmount < 0 || form.depositAmount > preview.total)) fe.depositAmount = 'Tiền cọc từ 0 đến tổng tiền'
    setFields(fe)
    if (Object.keys(fe).length) return
    setBusy(true)
    setErr(null)
    try {
      const body = { ...form, depositAmount: customDeposit ? form.depositAmount : null, send }
      const r = draftId
        ? await api<BookingDetail>(`/api/coord/bookings/${b.summary.id}/quotes/${draftId}`, { method: 'PUT', body })
        : await api<BookingDetail>(`/api/coord/bookings/${b.summary.id}/quotes`, { body })
      onSaved(r, send)
    } catch (e) {
      setErr(errorMessage(e))
      if (e instanceof ApiError && e.fields) setFields(e.fields)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={draftId ? 'Sửa báo giá nháp' : 'Lập báo giá mới'} onClose={onClose} wide busy={busy}>
      {!form ? (
        <Spinner />
      ) : (
        <div className="stack">
          {b.quotes.some((q) => q.status === 'SENT' || q.status === 'ACCEPTED') && !draftId && (
            <Alert tone="warn">Gửi bản mới sẽ thay thế báo giá đang có; khách cần chấp nhận lại. Báo giá cũ được giữ nguyên để đối chiếu.</Alert>
          )}
          <div className="table-wrap">
            <table className="table quote-edit">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Loại</th>
                  <th>Mô tả</th>
                  <th style={{ width: 90 }} className="r">
                    SL
                  </th>
                  <th style={{ width: 80 }}>Đơn vị</th>
                  <th style={{ width: 130 }} className="r">
                    Đơn giá
                  </th>
                  <th style={{ width: 120 }} className="r">
                    Thành tiền
                  </th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      <select className="input input-sm" value={it.itemType} onChange={(e) => upd(i, { itemType: e.target.value as QuoteItemInput['itemType'] })}>
                        {Object.entries(ITEM_TYPE).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className={`input input-sm ${fields[`items[${i}].description`] ? 'is-invalid' : ''}`}
                        value={it.description}
                        maxLength={255}
                        onChange={(e) => upd(i, { description: e.target.value })}
                        aria-label="Mô tả"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={`input input-sm r ${fields[`items[${i}].quantity`] ? 'is-invalid' : ''}`}
                        value={it.quantity}
                        onChange={(e) => upd(i, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                        aria-label="Số lượng"
                      />
                    </td>
                    <td>
                      <input className="input input-sm" value={it.unit} maxLength={30} onChange={(e) => upd(i, { unit: e.target.value })} aria-label="Đơn vị" />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        className={`input input-sm r ${fields[`items[${i}].unitPrice`] ? 'is-invalid' : ''}`}
                        value={it.unitPrice}
                        onChange={(e) => upd(i, { unitPrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                        aria-label="Đơn giá"
                      />
                    </td>
                    <td className="r nowrap" style={it.itemType === 'DISCOUNT' ? { color: 'var(--green)' } : undefined}>
                      {it.itemType === 'DISCOUNT' ? '−' : ''}
                      {money(Math.round(it.quantity * it.unitPrice))}
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label="Xóa dòng"
                        onClick={() => setForm((f) => (f ? { ...f, items: f.items.filter((_, k) => k !== i) } : f))}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setForm((f) => (f ? { ...f, items: [...f.items, { itemType: 'FEE', description: '', quantity: 1, unit: 'gói', unitPrice: 0 }] } : f))}
            >
              + Thêm dòng chi phí
            </button>
            {fields.items && <span className="field-error">{fields.items}</span>}
            <span className="spacer" />
            <span>
              Tổng (xem trước): <strong className="price">{money(preview.total)}</strong>
            </span>
          </div>
          <div className="form-row-3">
            <Field label="Tiền cọc yêu cầu" error={fields.depositAmount} hint={customDeposit ? undefined : `Mặc định ${pct}% ≈ ${money(preview.deposit)}`}>
              <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                <label className="check" style={{ whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={customDeposit} onChange={(e) => setCustomDeposit(e.target.checked)} /> Tự nhập
                </label>
                <input
                  type="number"
                  min={0}
                  step={100000}
                  className="input"
                  disabled={!customDeposit}
                  value={customDeposit ? (form.depositAmount ?? '') : ''}
                  onChange={(e) => setForm({ ...form, depositAmount: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            </Field>
            <Field label="Hiệu lực đến" required error={fields.validUntil}>
              <input
                type="date"
                className="input"
                min={toLocalInput(new Date()).slice(0, 10)}
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </Field>
            <Field label="Ghi chú cho khách">
              <input className="input" maxLength={1000} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <Field label="Điều kiện">
            <textarea className="input" rows={2} maxLength={2000} value={form.terms ?? ''} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </Field>
          <p className="small muted" style={{ margin: 0 }}>
            Thành tiền và tổng tiền chính thức do hệ thống tính lại khi lưu. Báo giá đã gửi không sửa được — muốn thay đổi hãy tạo phiên bản mới.
          </p>
          {err && <Alert tone="danger">{err}</Alert>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Hủy
            </button>
            <button className="btn btn-outline" onClick={() => save(false)} disabled={busy}>
              Lưu nháp
            </button>
            <button className="btn btn-primary" onClick={() => save(true)} disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu & gửi khách'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---------------- Thanh toan ----------------

export function PaymentModal({ b, onClose, onSaved }: { b: BookingDetail; onClose: () => void; onSaved: (d: BookingDetail) => void }) {
  const s = b.paymentSummary
  const canCollect = b.allowedActions.includes('RECORD_PAYMENT')
  const canRefund = b.allowedActions.includes('RECORD_REFUND')
  const defaultType = canCollect ? (s.netPaid < (s.depositRequired ?? 0) ? 'DEPOSIT' : 'BALANCE') : 'REFUND'
  const [type, setType] = useState<'DEPOSIT' | 'BALANCE' | 'REFUND'>(defaultType)
  const suggested = (t: string) =>
    t === 'DEPOSIT' ? Math.max(0, (s.depositRequired ?? 0) - s.netPaid) : t === 'BALANCE' ? (s.remaining ?? 0) : 0
  const [amount, setAmount] = useState<string>(String(suggested(defaultType) || ''))
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [ref, setRef] = useState('')
  const [paidAt, setPaidAt] = useState(toLocalInput(new Date()))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Mot khoa cho moi lan mo form: bam nhieu lan / thu lai sau loi mang van khong ghi trung
  const [key] = useState(newIdemKey)

  async function submit() {
    const n = Number(amount)
    if (!(n > 0)) return setErr('Số tiền phải lớn hơn 0')
    if (type !== 'REFUND' && s.remaining != null && n > s.remaining) return setErr(`Vượt quá số còn phải thu (${money(s.remaining)})`)
    if (type === 'REFUND' && n > s.netPaid) return setErr(`Vượt quá số đã thu thực tế (${money(s.netPaid)})`)
    if (new Date(paidAt) > new Date(Date.now() + 5 * 60000)) return setErr('Thời điểm thanh toán không được ở tương lai')
    setBusy(true)
    setErr(null)
    try {
      const r = await api<BookingDetail>(`/api/coord/bookings/${b.summary.id}/payments`, {
        body: { type, amount: n, method, referenceCode: ref || null, paidAt: fromInput(paidAt), note: note || null },
        headers: { 'Idempotency-Key': key },
      })
      onSaved(r)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Ghi nhận giao dịch" onClose={onClose} busy={busy}>
      <div className="stack">
        <div className="money-grid small-grid">
          <div>
            <span>Tổng báo giá</span>
            <strong>{money(s.total)}</strong>
          </div>
          <div>
            <span>Đã thu ròng</span>
            <strong>{money(s.netPaid)}</strong>
          </div>
          <div>
            <span>Còn phải thu</span>
            <strong>{money(s.remaining)}</strong>
          </div>
        </div>
        <Field label="Loại giao dịch" required>
          <div className="chips" style={{ margin: 0 }}>
            {(['DEPOSIT', 'BALANCE', 'REFUND'] as const)
              .filter((t) => (t === 'REFUND' ? canRefund : canCollect))
              .map((t) => (
                <button
                  type="button"
                  key={t}
                  className={`chip ${type === t ? 'active' : ''}`}
                  onClick={() => {
                    setType(t)
                    setAmount(String(suggested(t) || ''))
                  }}
                >
                  {PAYMENT_TYPE[t]}
                </button>
              ))}
          </div>
        </Field>
        <div className="form-row">
          <Field label="Số tiền (đ)" required>
            <input type="number" className="input" min={1} step={1000} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Phương thức" required>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Thời điểm nhận/chi tiền" required>
            <input type="datetime-local" className="input" value={paidAt} max={toLocalInput(new Date())} onChange={(e) => setPaidAt(e.target.value)} />
          </Field>
          <Field label="Mã tham chiếu" hint="Mã giao dịch ngân hàng, số biên nhận…">
            <input className="input" maxLength={100} value={ref} onChange={(e) => setRef(e.target.value)} />
          </Field>
        </div>
        <Field label="Ghi chú">
          <input className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <p className="small muted" style={{ margin: 0 }}>
          Chỉ ghi nhận khi đã thực nhận/chi tiền. Hệ thống không tạo giao dịch ngân hàng. {type === 'REFUND' && 'Hoàn tiền không tự đổi trạng thái đơn.'}
        </p>
        {err && <Alert tone="danger">{err}</Alert>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button className={`btn ${type === 'REFUND' ? 'btn-danger' : 'btn-primary'}`} onClick={submit} disabled={busy}>
            {busy ? 'Đang ghi nhận…' : 'Ghi nhận'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ---------------- Phan cong ----------------

function ConflictList({ conflicts }: { conflicts: ScheduleConflict[] }) {
  return (
    <ul className="conflicts">
      {conflicts.map((c) => (
        <li key={c.assignmentId}>
          Vướng tiệc <strong>#{c.bookingCode}</strong> ({c.task}): {dateTime(c.shiftStart)} → {dateTime(c.shiftEnd)}
        </li>
      ))}
    </ul>
  )
}

export function AssignModal({
  b,
  editing,
  onClose,
  onSaved,
}: {
  b: BookingDetail
  editing: AssignmentLite | null
  onClose: () => void
  onSaved: (d: BookingDetail) => void
}) {
  const [skill, setSkill] = useState<Skill>((editing?.taskRole as Skill) ?? 'CHEF')
  const [sugs, setSugs] = useState<StaffSuggestion[] | null>(null)
  const [sugErr, setSugErr] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<number | null>(editing?.staffId ?? null)
  const [task, setTask] = useState(editing?.task ?? '')
  const [start, setStart] = useState(editing ? toInput(editing.shiftStart) : '')
  const [end, setEnd] = useState(editing ? toInput(editing.shiftEnd) : '')
  const [shift, setShift] = useState<DefaultShift | null>(null)
  const [note, setNote] = useState(editing?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])

  useEffect(() => {
    api<DefaultShift>(`/api/coord/bookings/${b.summary.id}/default-shift`)
      .then((d) => {
        setShift(d)
        if (!editing) {
          setStart(toInput(d.shiftStart))
          setEnd(toInput(d.shiftEnd))
        }
      })
      .catch(() => {})
  }, [b.summary.id, editing])

  useEffect(() => {
    if (editing) return
    setSugs(null)
    setSugErr(null)
    api<StaffSuggestion[]>(`/api/coord/bookings/${b.summary.id}/staff-suggestions?skill=${skill}`)
      .then(setSugs)
      .catch((e) => setSugErr(errorMessage(e)))
  }, [b.summary.id, skill, editing])

  const defaultTask: Record<Skill, string> = {
    CHEF: 'Bếp chính – nấu thực đơn',
    ASSISTANT_CHEF: 'Sơ chế, phụ bếp',
    SERVER: 'Phục vụ khách, bày món',
    SETUP: 'Setup bàn ghế, trang trí, thu dọn',
    DRIVER: 'Vận chuyển dụng cụ, nguyên liệu',
  }

  async function submit() {
    if (!staffId) return setErr('Chọn nhân viên')
    if (!task.trim()) return setErr('Nhập nhiệm vụ')
    if (!start || !end || end <= start) return setErr('Giờ kết thúc ca phải sau giờ bắt đầu ca')
    setBusy(true)
    setErr(null)
    setConflicts([])
    try {
      const body = { staffId, taskRole: skill, task: task.trim(), shiftStart: fromInput(start), shiftEnd: fromInput(end), note: note || null }
      const r = editing
        ? await api<BookingDetail>(`/api/coord/assignments/${editing.id}`, { method: 'PUT', body })
        : await api<BookingDetail>(`/api/coord/bookings/${b.summary.id}/assignments`, { body })
      onSaved(r)
    } catch (e) {
      setErr(errorMessage(e))
      if (e instanceof ApiError && e.code === 'SCHEDULE_CONFLICT' && Array.isArray(e.details)) setConflicts(e.details as ScheduleConflict[])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={editing ? `Sửa phân công – ${editing.staffName}` : 'Phân công nhân viên'} onClose={onClose} wide busy={busy}>
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>
          Tiệc: {dateTime(b.summary.startTime)} → {dateTime(b.summary.endTime)}.
          {shift && ` Ca mặc định tính thêm ${shift.prepMinutes} phút chuẩn bị và ${shift.teardownMinutes} phút thu dọn.`}
        </p>
        <Field label="Vai trò / kỹ năng" required>
          <div className="chips" style={{ margin: 0 }}>
            {(Object.keys(SKILLS) as Skill[]).map((k) => (
              <button
                type="button"
                key={k}
                className={`chip ${skill === k ? 'active' : ''}`}
                onClick={() => {
                  setSkill(k)
                  if (!editing) {
                    setStaffId(null)
                    if (!task || Object.values(defaultTask).includes(task)) setTask(defaultTask[k])
                  }
                }}
              >
                {SKILLS[k]}
              </button>
            ))}
          </div>
        </Field>
        {!editing && (
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Chọn nhân viên <span className="muted small">(gợi ý: đúng kỹ năng → rảnh trong ca → ít ca trong tuần)</span>
            </div>
            {sugErr ? (
              <Alert tone="danger">{sugErr}</Alert>
            ) : !sugs ? (
              <Spinner />
            ) : (
              <div className="staff-pick">
                {sugs
                  .filter((s) => s.hasSkill)
                  .map((s) => (
                    <label key={s.staffId} className={`staff-opt ${staffId === s.staffId ? 'selected' : ''} ${s.free ? '' : 'busy'}`}>
                      <input
                        type="radio"
                        name="staff"
                        checked={staffId === s.staffId}
                        onChange={() => {
                          setStaffId(s.staffId)
                          if (!task) setTask(defaultTask[skill])
                        }}
                      />
                      <div>
                        <div className="row" style={{ gap: 6 }}>
                          <strong>{s.fullName}</strong>
                          {s.free ? <span className="badge badge-ok">Rảnh</span> : <span className="badge badge-danger">Trùng lịch</span>}
                          {s.alreadyOnBooking && <span className="badge badge-info">Đã ở tiệc này</span>}
                        </div>
                        <div className="small muted">
                          {s.skills.map((k) => SKILLS[k]).join(', ')} · {s.shiftsThisWeek} ca trong tuần
                        </div>
                        {!s.free && <ConflictList conflicts={s.conflicts} />}
                      </div>
                    </label>
                  ))}
                {sugs.filter((s) => s.hasSkill).length === 0 && <p className="muted small">Không có nhân viên đang hoạt động có kỹ năng này.</p>}
              </div>
            )}
          </div>
        )}
        <Field label="Nhiệm vụ" required>
          <input className="input" maxLength={255} value={task} onChange={(e) => setTask(e.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="Bắt đầu ca" required hint="Gồm thời gian chuẩn bị">
            <input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Kết thúc ca" required hint="Gồm thời gian thu dọn">
            <input type="datetime-local" className="input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Ghi chú">
          <input className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {err && (
          <Alert tone="danger">
            {err}
            {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}
          </Alert>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Phân công'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
