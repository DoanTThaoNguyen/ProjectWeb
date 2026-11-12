import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../../api/client'
import { useApi } from '../../api/useApi'
import type { AssignmentLite, BookingDetail } from '../../api/types'
import { AdminHeader } from '../../components/AdminLayout'
import { HistoryTimeline, PaymentBlock, ProgressFlow, QuoteView, StatusBadge } from '../../components/BookingParts'
import { Alert, Badge, EmptyState, ErrorState, Field, Modal, Spinner } from '../../components/ui'
import { money, time, timeRange, dateShort } from '../../utils/format'
import { ACTION_LABEL, ASSIGNMENT_STATUS, CHARGE_TYPE, PAYMENT_STATUS, SKILLS, TASK_STATUS } from '../../utils/labels'
import { AssignModal, PaymentModal, QuoteEditor } from './BookingPanels'

type Msg = { tone: 'ok' | 'danger'; text: string } | null

export default function BookingAdminDetailPage() {
  const { id } = useParams()
  const { data: b, loading, error, reload, setData } = useApi<BookingDetail>(`/api/coord/bookings/${id}`)
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  const [quoteEdit, setQuoteEdit] = useState<{ draftId: number | null } | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [assign, setAssign] = useState<{ editing: AssignmentLite | null } | null>(null)
  const [reasonModal, setReasonModal] = useState<'CANCEL' | 'REJECT' | null>(null)
  const [reason, setReason] = useState('')
  const [reasonErr, setReasonErr] = useState('')
  const [confirm, setConfirm] = useState<{ title: string; text: string; run: () => Promise<void> } | null>(null)

  if (loading && !b) return <Spinner />
  if (error || !b)
    return (
      <>
        <ErrorState message={error ?? 'Không tìm thấy đơn'} onRetry={reload} />
        <p style={{ textAlign: 'center' }}>
          <Link to="/quan-tri/don">← Danh sách đơn</Link>
        </p>
      </>
    )

  const s = b.summary
  const can = (a: string) => b.allowedActions.includes(a)
  const canQuote = !['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(s.status)
  const draft = b.quotes.find((q) => q.status === 'DRAFT')
  const pay = PAYMENT_STATUS[s.paymentStatus]

  async function run(fn: () => Promise<BookingDetail>, ok: string) {
    setBusy(true)
    setMsg(null)
    try {
      setData(await fn())
      setMsg({ tone: 'ok', text: ok })
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const doAction = (action: string, ok: string) =>
    run(() => api<BookingDetail>(`/api/coord/bookings/${s.id}/actions`, { body: { action } }), ok)

  async function submitReason() {
    if (reasonModal === 'CANCEL' && !reason.trim()) return setReasonErr('Vui lòng nhập lý do hủy')
    const kind = reasonModal
    setReasonModal(null)
    if (kind === 'CANCEL') {
      await run(() => api<BookingDetail>(`/api/coord/bookings/${s.id}/cancel`, { body: { reason: reason.trim() } }), 'Đã hủy đơn. Nếu cần hoàn cọc, hãy ghi nhận giao dịch hoàn tiền.')
    } else {
      await run(() => api<BookingDetail>(`/api/coord/bookings/${s.id}/cancel-request/reject`, { body: { note: reason.trim() } }), 'Đã từ chối yêu cầu hủy.')
    }
    setReason('')
  }

  const actionButtons = (
    <>
      {can('TO_CONSULTING') && (
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => doAction('TO_CONSULTING', 'Đã tiếp nhận, đơn chuyển sang “Đang tư vấn”.')}>
          {ACTION_LABEL.TO_CONSULTING}
        </button>
      )}
      {can('START') && (
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() =>
            setConfirm({
              title: 'Bắt đầu thực hiện tiệc?',
              text: 'Đơn chuyển sang “Đang thực hiện”. Chỉ làm được trong vòng 24 giờ trước giờ khai tiệc và khi đã phân công nhân sự.',
              run: () => doAction('START', 'Đơn đang được thực hiện.'),
            })
          }
        >
          {ACTION_LABEL.START}
        </button>
      )}
      {can('COMPLETE') && (
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() =>
            setConfirm({
              title: 'Xác nhận hoàn tất tiệc?',
              text:
                b.paymentSummary.remaining && b.paymentSummary.remaining > 0
                  ? `Khách còn ${money(b.paymentSummary.remaining)} chưa thanh toán. Bạn vẫn có thể hoàn tất và ghi nhận thu sau.`
                  : 'Đơn sẽ chuyển sang “Hoàn tất” và được tính vào doanh thu.',
              run: () => doAction('COMPLETE', 'Đơn đã hoàn tất.'),
            })
          }
        >
          {ACTION_LABEL.COMPLETE}
        </button>
      )}
      {can('CANCEL') && (
        <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { setReason(''); setReasonErr(''); setReasonModal('CANCEL') }}>
          Hủy đơn
        </button>
      )}
    </>
  )

  return (
    <>
      <AdminHeader
        title={`Đơn #${s.code}`}
        subtitle={
          <>
            <Link to="/quan-tri/don">Đơn tiệc</Link> / {s.menuName} · {s.serviceName}
          </>
        }
        actions={actionButtons}
      />
      <div className="detail-grid admin-detail">
        <div className="stack">
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <div className="card card-pad">
            <div className="row">
              <StatusBadge status={s.status} />
              <Badge tone={pay.tone}>{pay.label}</Badge>
              <Badge tone={ASSIGNMENT_STATUS[s.assignmentStatus]?.tone}>{ASSIGNMENT_STATUS[s.assignmentStatus]?.label}</Badge>
              <span className="spacer" />
              <span className="small muted">Gửi lúc {new Date(s.createdAt).toLocaleString('vi-VN')}</span>
            </div>
            <ProgressFlow status={s.status} />
            {s.cancelRequested && s.status !== 'CANCELLED' && (
              <Alert tone="warn">
                <strong>Khách đã gửi yêu cầu hủy.</strong> Lý do: {b.cancelReason}
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { setReason(''); setReasonErr(''); setReasonModal('CANCEL') }}>
                    Chấp nhận hủy
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setReason(''); setReasonErr(''); setReasonModal('REJECT') }}>
                    Từ chối yêu cầu
                  </button>
                </div>
              </Alert>
            )}
            {s.status === 'CANCELLED' && (
              <Alert tone="info">
                Đơn đã hủy{b.cancelledAt ? ` lúc ${new Date(b.cancelledAt).toLocaleString('vi-VN')}` : ''}. Lý do: {b.cancelReason ?? '—'}. Hủy không đồng nghĩa đã hoàn tiền.
              </Alert>
            )}
          </div>

          <section>
            <div className="section-bar">
              <h2>Báo giá</h2>
              {canQuote &&
                (draft ? (
                  <button className="btn btn-outline btn-sm" onClick={() => setQuoteEdit({ draftId: draft.id })}>
                    Sửa bản nháp
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => setQuoteEdit({ draftId: null })}>
                    {b.quotes.length ? '+ Tạo phiên bản mới' : '+ Lập báo giá'}
                  </button>
                ))}
            </div>
            {b.quotes.length === 0 ? (
              <div className="card card-pad">
                <p className="muted" style={{ margin: 0 }}>
                  Chưa có báo giá. Tạm tính khi khách gửi: <strong>{money(s.estimatedTotal)}</strong>
                  {b.budget != null && <> · Ngân sách khách: <strong>{money(b.budget)}</strong></>}
                </p>
              </div>
            ) : (
              b.quotes.map((q) => (
                <QuoteView
                  key={q.id}
                  q={q}
                  accepted={q.id === b.acceptedQuoteId}
                  footer={
                    q.status === 'DRAFT' ? (
                      <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                        <span className="small muted">Bản nháp – khách chưa thấy.</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setQuoteEdit({ draftId: q.id })}>
                          Sửa
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              title: `Gửi báo giá v${q.versionNo} cho khách?`,
                              text: `Tổng ${money(q.total)}, cọc ${money(q.depositAmount)}. Sau khi gửi không sửa được.`,
                              run: () => run(() => api<BookingDetail>(`/api/coord/bookings/${s.id}/quotes/${q.id}/send`, { method: 'POST' }), 'Đã gửi báo giá cho khách.'),
                            })
                          }
                        >
                          Gửi khách
                        </button>
                      </div>
                    ) : null
                  }
                />
              ))
            )}
          </section>

          <section className="card card-pad">
            <div className="section-bar">
              <h2>Thanh toán</h2>
              {(can('RECORD_PAYMENT') || can('RECORD_REFUND')) && (
                <button className="btn btn-primary btn-sm" onClick={() => setPayOpen(true)}>
                  + Ghi nhận giao dịch
                </button>
              )}
            </div>
            {!b.acceptedQuoteId && s.status !== 'CANCELLED' && (
              <p className="small muted">Chỉ ghi nhận thu tiền sau khi khách chấp nhận báo giá.</p>
            )}
            <PaymentBlock b={b} />
          </section>

          <section className="card card-pad">
            <div className="section-bar">
              <h2>Phân công nhân sự</h2>
              {can('ASSIGN') && (
                <button className="btn btn-primary btn-sm" onClick={() => setAssign({ editing: null })}>
                  + Phân công
                </button>
              )}
            </div>
            {!can('ASSIGN') && b.assignments.length === 0 && (
              <p className="small muted">Phân công khi khách đã chấp nhận báo giá (chờ cọc / đã xác nhận).</p>
            )}
            {b.assignments.length === 0 ? (
              can('ASSIGN') && <EmptyState title="Chưa phân công ai">Bấm “Phân công” để chọn nhân viên theo kỹ năng và giờ rảnh.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Vai trò / nhiệm vụ</th>
                      <th>Ca làm</th>
                      <th>Trạng thái</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {b.assignments.map((a) => (
                      <tr key={a.id} className={a.status === 'CANCELLED' ? 'row-muted' : ''}>
                        <td>
                          <strong>{a.staffName}</strong>
                          <div className="small muted">{a.staffPhone}</div>
                        </td>
                        <td>
                          {SKILLS[a.taskRole]}
                          <div className="small">{a.task}</div>
                          {a.note && <div className="small muted">{a.note}</div>}
                        </td>
                        <td className="nowrap">
                          {time(a.shiftStart)} – {time(a.shiftEnd)}
                          <div className="small muted">{dateShort(a.shiftStart)}</div>
                        </td>
                        <td>
                          <Badge tone={TASK_STATUS[a.status]?.tone}>{TASK_STATUS[a.status]?.label}</Badge>
                        </td>
                        <td className="r nowrap">
                          {a.status !== 'CANCELLED' && a.status !== 'DONE' && s.status !== 'CANCELLED' && (
                            <>
                              <button className="link-btn small" onClick={() => setAssign({ editing: a })}>
                                Sửa
                              </button>{' '}
                              <button
                                className="link-btn small danger"
                                onClick={() =>
                                  setConfirm({
                                    title: `Hủy phân công ${a.staffName}?`,
                                    text: 'Nhân viên sẽ không còn thấy công việc này; lịch của họ được giải phóng.',
                                    run: () => run(() => api<BookingDetail>(`/api/coord/assignments/${a.id}/cancel`, { method: 'POST' }), 'Đã hủy phân công.'),
                                  })
                                }
                              >
                                Hủy
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small muted" style={{ marginBottom: 0 }}>
              Nhân viên hoàn thành nhiệm vụ không tự hoàn tất đơn – điều phối xác nhận “Hoàn tất” sau khi kiểm tra.
            </p>
          </section>
        </div>

        <aside className="stack">
          <div className="card card-pad">
            <h3>Thông tin tiệc</h3>
            <dl className="kv" style={{ margin: 0 }}>
              <dt>Thời gian</dt>
              <dd>{timeRange(s.startTime, s.endTime)}</dd>
              <dt>Địa chỉ</dt>
              <dd>{s.address}</dd>
              <dt>Số khách</dt>
              <dd>
                {s.guestCount}
                {s.tableCount ? ` · ${s.tableCount} bàn` : ''}
              </dd>
              <dt>Thực đơn</dt>
              <dd>
                {s.menuName}
                <div className="small muted">
                  Giá lúc đặt {money(b.menuPriceSnapshot)}/{b.menuUnitSnapshot === 'TABLE' ? 'bàn' : 'khách'}
                </div>
              </dd>
              <dt>Dịch vụ thêm</dt>
              <dd>
                {b.addons.length
                  ? b.addons.map((a) => (
                      <div key={a.addonId}>
                        {a.name}
                        {a.quantity > 1 ? ` ×${a.quantity}` : ''} <span className="small muted">({CHARGE_TYPE[a.chargeType]})</span>
                      </div>
                    ))
                  : 'Không'}
              </dd>
              <dt>Ngân sách</dt>
              <dd>{b.budget != null ? money(b.budget) : '—'}</dd>
              <dt>Tạm tính</dt>
              <dd>{money(s.estimatedTotal)}</dd>
            </dl>
            {b.note && (
              <p className="small" style={{ marginTop: 12 }}>
                <strong>Ghi chú của khách:</strong> {b.note}
              </p>
            )}
          </div>
          <div className="card card-pad">
            <h3>Khách hàng</h3>
            <dl className="kv" style={{ margin: 0 }}>
              <dt>Tài khoản</dt>
              <dd>
                {b.customerName}
                <div className="small muted">{s.customerEmail}</div>
              </dd>
              <dt>Liên hệ</dt>
              <dd>
                {s.contactName}
                <div>
                  <a href={`tel:${s.contactPhone}`}>{s.contactPhone}</a>
                </div>
              </dd>
            </dl>
          </div>
          <div className="card card-pad">
            <h3>Lịch sử xử lý</h3>
            <HistoryTimeline b={b} />
          </div>
        </aside>
      </div>

      {quoteEdit && (
        <QuoteEditor
          b={b}
          draftId={quoteEdit.draftId}
          onClose={() => setQuoteEdit(null)}
          onSaved={(d, sent) => {
            setData(d)
            setQuoteEdit(null)
            setMsg({ tone: 'ok', text: sent ? 'Đã gửi báo giá cho khách.' : 'Đã lưu bản nháp báo giá.' })
          }}
        />
      )}
      {payOpen && (
        <PaymentModal
          b={b}
          onClose={() => setPayOpen(false)}
          onSaved={(d) => {
            const before = b.summary.status
            setData(d)
            setPayOpen(false)
            setMsg({
              tone: 'ok',
              text: before === 'AWAITING_DEPOSIT' && d.summary.status === 'CONFIRMED' ? 'Đã ghi nhận. Đủ cọc – đơn đã được xác nhận.' : 'Đã ghi nhận giao dịch.',
            })
          }}
        />
      )}
      {assign && (
        <AssignModal
          b={b}
          editing={assign.editing}
          onClose={() => setAssign(null)}
          onSaved={(d) => {
            setData(d)
            setAssign(null)
            setMsg({ tone: 'ok', text: assign.editing ? 'Đã cập nhật phân công.' : 'Đã phân công nhân viên.' })
          }}
        />
      )}
      {reasonModal && (
        <Modal title={reasonModal === 'CANCEL' ? 'Hủy đơn tiệc' : 'Từ chối yêu cầu hủy'} onClose={() => setReasonModal(null)}>
          <Field label={reasonModal === 'CANCEL' ? 'Lý do / cách xử lý' : 'Phản hồi cho khách'} required={reasonModal === 'CANCEL'} error={reasonErr}>
            <textarea
              className="input"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setReasonErr('')
              }}
            />
          </Field>
          {reasonModal === 'CANCEL' && (
            <p className="small muted">Các phân công chưa hoàn thành sẽ bị hủy. Tiền đã thu không tự hoàn – ghi nhận hoàn tiền riêng nếu có.</p>
          )}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setReasonModal(null)}>
              Đóng
            </button>
            <button className={`btn ${reasonModal === 'CANCEL' ? 'btn-danger' : 'btn-primary'}`} onClick={submitReason}>
              Xác nhận
            </button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p>{confirm.text}</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
              Để sau
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                const c = confirm
                setConfirm(null)
                await c.run()
              }}
            >
              Đồng ý
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
