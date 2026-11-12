import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useApi } from '../api/useApi'
import type { BookingDetail } from '../api/types'
import { HistoryTimeline, PaymentBlock, ProgressFlow, QuoteView, StatusBadge } from '../components/BookingParts'
import { Alert, ErrorState, Field, PageHeader, Spinner } from '../components/ui'
import { money, timeRange } from '../utils/format'
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/labels'
import { BRAND } from '../config'

export default function BookingDetailPage() {
  const { id } = useParams()
  const { data: b, loading, error, reload, setData } = useApi<BookingDetail>(`/api/bookings/${id}`)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)
  const [confirmQuote, setConfirmQuote] = useState<number | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonErr, setReasonErr] = useState('')

  if (loading && !b) return <Spinner />
  if (error || !b)
    return (
      <div className="container section">
        <ErrorState message={error ?? 'Không tìm thấy đơn'} onRetry={reload} />
        <p style={{ textAlign: 'center' }}>
          <Link to="/don-cua-toi">← Về danh sách đơn</Link>
        </p>
      </div>
    )

  const s = b.summary
  const can = (a: string) => b.allowedActions.includes(a)

  async function accept(quoteId: number) {
    setBusy(true)
    setMsg(null)
    try {
      const r = await api<BookingDetail>(`/api/bookings/${b!.summary.id}/quotes/${quoteId}/accept`, { method: 'POST' })
      setData(r)
      setMsg({ tone: 'ok', text: 'Bạn đã chấp nhận báo giá. Vui lòng đặt cọc để chúng tôi xác nhận lịch tiệc.' })
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    } finally {
      setBusy(false)
      setConfirmQuote(null)
    }
  }

  async function cancel() {
    if (!reason.trim()) {
      setReasonErr('Vui lòng nhập lý do')
      return
    }
    setBusy(true)
    try {
      const r = await api<BookingDetail>(`/api/bookings/${b!.summary.id}/cancel`, { body: { reason: reason.trim() } })
      setData(r)
      setMsg({
        tone: 'ok',
        text: r.summary.status === 'CANCELLED' ? 'Đã hủy yêu cầu đặt tiệc.' : 'Đã gửi yêu cầu hủy. Điều phối viên sẽ liên hệ để xử lý.',
      })
      setCancelOpen(false)
      setReason('')
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
      setCancelOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const visibleQuotes = b.quotes
  const pay = PAYMENT_STATUS[s.paymentStatus]

  return (
    <>
      <PageHeader
        title={`Đơn #${s.code}`}
        subtitle={`${s.menuName} · ${s.serviceName}`}
        crumbs={[{ to: '/don-cua-toi', label: 'Đơn của tôi' }, { label: s.code }]}
      />
      <section className="section-tight">
        <div className="container detail-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          <div className="stack">
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
            <div className="card card-pad">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="row">
                  <StatusBadge status={s.status} />
                  <span className={`badge badge-${pay.tone}`}>{pay.label}</span>
                </div>
                <span className="muted small">Gửi lúc {new Date(s.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <ProgressFlow status={s.status} />
              <p className="small" style={{ margin: '10px 0 0' }}>
                {BOOKING_STATUS[s.status].hint}
              </p>
              {s.cancelRequested && s.status !== 'CANCELLED' && (
                <Alert tone="warn">
                  Bạn đã gửi yêu cầu hủy (lý do: {b.cancelReason}). Điều phối viên sẽ liên hệ để xử lý; việc hoàn cọc (nếu có) theo điều kiện báo giá.
                </Alert>
              )}
              {s.status === 'CANCELLED' && b.cancelReason && <Alert tone="info">Lý do hủy: {b.cancelReason}</Alert>}
              {s.status === 'AWAITING_DEPOSIT' && (
                <Alert tone="warn">
                  Vui lòng chuyển khoản tiền cọc <strong>{money(b.paymentSummary.depositRequired)}</strong> với nội dung <strong>{s.code}</strong>, hoặc
                  liên hệ {BRAND.hotline}. Đơn được xác nhận khi chúng tôi ghi nhận đã nhận tiền (không tự xác nhận qua website).
                </Alert>
              )}
            </div>

            <div>
              <h2 style={{ fontSize: '1.4rem' }}>Báo giá</h2>
              {visibleQuotes.length === 0 ? (
                <div className="card card-pad">
                  <p className="muted" style={{ margin: 0 }}>
                    Chưa có báo giá. Giá tạm tính khi gửi yêu cầu: <strong className="price">{money(s.estimatedTotal)}</strong> (chưa phải báo giá xác
                    nhận).
                  </p>
                </div>
              ) : (
                visibleQuotes.map((q) => (
                  <QuoteView
                    key={q.id}
                    q={q}
                    accepted={q.id === b.acceptedQuoteId}
                    footer={
                      q.status === 'SENT' && !q.expired && can('ACCEPT_QUOTE') ? (
                        <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                          <span className="small muted">Chấp nhận nghĩa là bạn đồng ý tổng tiền và điều kiện trên.</span>
                          <button className="btn btn-primary" disabled={busy} onClick={() => setConfirmQuote(q.id)}>
                            Chấp nhận báo giá
                          </button>
                        </div>
                      ) : q.status === 'SENT' && q.expired ? (
                        <Alert tone="warn">Báo giá đã hết hiệu lực. Vui lòng liên hệ {BRAND.hotline} để nhận báo giá mới.</Alert>
                      ) : null
                    }
                  />
                ))
              )}
            </div>

            <div className="card card-pad">
              <h2 style={{ fontSize: '1.4rem' }}>Thanh toán</h2>
              <PaymentBlock b={b} />
            </div>
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
                  <Link to={`/thuc-don/${b.menuSlug}`}>{s.menuName}</Link>
                </dd>
                <dt>Dịch vụ thêm</dt>
                <dd>{b.addons.length ? b.addons.map((a) => a.name + (a.quantity > 1 ? ` ×${a.quantity}` : '')).join(', ') : 'Không'}</dd>
                <dt>Liên hệ</dt>
                <dd>
                  {s.contactName}
                  <br />
                  {s.contactPhone}
                </dd>
                {b.budget != null && (
                  <>
                    <dt>Ngân sách</dt>
                    <dd>{money(b.budget)}</dd>
                  </>
                )}
                <dt>Tạm tính ban đầu</dt>
                <dd>{money(s.estimatedTotal)}</dd>
              </dl>
              {b.note && <p className="small" style={{ marginTop: 12 }}>Ghi chú: {b.note}</p>}
            </div>
            <div className="card card-pad">
              <h3>Lịch sử xử lý</h3>
              <HistoryTimeline b={b} />
            </div>
            {(can('CANCEL') || can('REQUEST_CANCEL')) && (
              <div className="card card-pad">
                <h3>{can('CANCEL') ? 'Hủy yêu cầu' : 'Yêu cầu hủy tiệc'}</h3>
                <p className="small muted">
                  {can('CANCEL')
                    ? 'Bạn có thể hủy trực tiếp vì chưa chấp nhận báo giá.'
                    : 'Bạn đã chấp nhận báo giá nên cần gửi yêu cầu hủy để điều phối viên xử lý. Hủy không đồng nghĩa đã được hoàn tiền.'}
                </p>
                <button className="btn btn-danger btn-sm" onClick={() => setCancelOpen(true)}>
                  {can('CANCEL') ? 'Hủy yêu cầu' : 'Gửi yêu cầu hủy'}
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>

      {confirmQuote !== null && (
        <div className="modal-back" role="dialog" aria-modal="true" onClick={() => !busy && setConfirmQuote(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Chấp nhận báo giá?</h3>
            <p>
              Tổng tiền: <strong className="price">{money(b.quotes.find((q) => q.id === confirmQuote)?.total)}</strong>
              <br />
              Tiền cọc cần thanh toán: <strong>{money(b.quotes.find((q) => q.id === confirmQuote)?.depositAmount)}</strong>
            </p>
            <p className="small muted">Sau khi chấp nhận, mọi thay đổi về giá sẽ được gửi bằng báo giá phiên bản mới để bạn xác nhận lại.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmQuote(null)} disabled={busy}>
                Để sau
              </button>
              <button className="btn btn-primary" onClick={() => accept(confirmQuote)} disabled={busy}>
                {busy ? 'Đang xử lý…' : 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="modal-back" role="dialog" aria-modal="true" onClick={() => !busy && setCancelOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{can('CANCEL') ? 'Hủy yêu cầu đặt tiệc' : 'Gửi yêu cầu hủy'}</h3>
            <Field label="Lý do" required error={reasonErr}>
              <textarea
                className="input"
                maxLength={500}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setReasonErr('')
                }}
              />
            </Field>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCancelOpen(false)} disabled={busy}>
                Không
              </button>
              <button className="btn btn-danger" onClick={cancel} disabled={busy}>
                {busy ? 'Đang gửi…' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
