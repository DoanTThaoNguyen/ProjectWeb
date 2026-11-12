import type { BookingDetail, BookingStatus, Quote } from '../api/types'
import { dateShort, dateTime, money } from '../utils/format'
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_TYPE, QUOTE_STATUS, STATUS_FLOW } from '../utils/labels'
import { Badge } from './ui'

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = BOOKING_STATUS[status]
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export function ProgressFlow({ status }: { status: BookingStatus }) {
  if (status === 'CANCELLED') return null
  const idx = STATUS_FLOW.indexOf(status)
  return (
    <div className="progress-flow" aria-label="Tiến độ đơn">
      {STATUS_FLOW.map((s, i) => (
        <div key={s} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
          {BOOKING_STATUS[s].label}
        </div>
      ))}
    </div>
  )
}

export function QuoteView({ q, accepted, footer }: { q: Quote; accepted?: boolean; footer?: React.ReactNode }) {
  const st = QUOTE_STATUS[q.status]
  return (
    <div className={`card quote-card ${q.status === 'SUPERSEDED' ? 'superseded' : ''}`}>
      <div className="quote-head">
        <div>
          <h3 style={{ margin: 0 }}>Báo giá phiên bản {q.versionNo}</h3>
          <span className="muted small">
            {q.sentAt ? `Gửi lúc ${dateTime(q.sentAt)}` : 'Chưa gửi'} · Hiệu lực đến {dateShort(q.validUntil)}
          </span>
        </div>
        <div className="row">
          {q.status === 'SENT' && q.expired && <Badge tone="danger">Hết hiệu lực</Badge>}
          <Badge tone={accepted ? 'ok' : st.tone}>{st.label}</Badge>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Hạng mục</th>
              <th className="r">SL</th>
              <th>Đơn vị</th>
              <th className="r">Đơn giá</th>
              <th className="r">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.itemType === 'DISCOUNT' ? '− ' : ''}
                  {i.description}
                </td>
                <td className="r">{Number(i.quantity).toLocaleString('vi-VN')}</td>
                <td>{i.unit}</td>
                <td className="r">{money(i.unitPrice)}</td>
                <td className="r" style={i.amount < 0 ? { color: 'var(--green)' } : undefined}>
                  {money(i.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Tổng cộng</td>
              <td className="r price" style={{ fontSize: '1.1rem' }}>
                {money(q.total)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="muted" style={{ fontWeight: 500 }}>
                Tiền cọc yêu cầu
              </td>
              <td className="r">{money(q.depositAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {(q.notes || q.terms) && (
        <div className="small" style={{ marginTop: 12 }}>
          {q.notes && (
            <p style={{ margin: '0 0 6px' }}>
              <strong>Ghi chú:</strong> {q.notes}
            </p>
          )}
          {q.terms && (
            <p className="muted" style={{ margin: 0 }}>
              <strong>Điều kiện:</strong> {q.terms}
            </p>
          )}
        </div>
      )}
      {footer}
    </div>
  )
}

export function PaymentBlock({ b }: { b: BookingDetail }) {
  const s = b.paymentSummary
  return (
    <div className="stack">
      <div className="money-grid">
        <div>
          <span>Tổng theo báo giá</span>
          <strong>{s.total != null ? money(s.total) : 'Chưa có'}</strong>
        </div>
        <div>
          <span>Cọc yêu cầu</span>
          <strong>{s.depositRequired != null ? money(s.depositRequired) : '—'}</strong>
        </div>
        <div>
          <span>Đã thanh toán (thực nhận)</span>
          <strong style={{ color: 'var(--green)' }}>{money(s.netPaid)}</strong>
        </div>
        <div>
          <span>Còn phải thanh toán</span>
          <strong style={{ color: 'var(--danger)' }}>{s.remaining != null ? money(s.remaining) : '—'}</strong>
        </div>
      </div>
      {s.refunded > 0 && <p className="small muted" style={{ margin: 0 }}>Đã hoàn lại: {money(s.refunded)}</p>}
      {b.payments.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Loại</th>
                <th>Phương thức</th>
                <th>Mã tham chiếu</th>
                <th className="r">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {b.payments.map((p) => (
                <tr key={p.id}>
                  <td>{dateTime(p.paidAt)}</td>
                  <td>{PAYMENT_TYPE[p.type]}</td>
                  <td>{PAYMENT_METHOD[p.method] ?? p.method}</td>
                  <td>{p.referenceCode ?? '—'}</td>
                  <td className="r" style={{ color: p.type === 'REFUND' ? 'var(--danger)' : undefined }}>
                    {p.type === 'REFUND' ? '−' : ''}
                    {money(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          Chưa có giao dịch nào được ghi nhận.
        </p>
      )}
    </div>
  )
}

export function HistoryTimeline({ b }: { b: BookingDetail }) {
  return (
    <ol className="timeline">
      {[...b.history].reverse().map((h, i) => (
        <li key={i}>
          <strong>{BOOKING_STATUS[h.toStatus as BookingStatus]?.label ?? h.toStatus}</strong>
          {h.note && <div className="small">{h.note}</div>}
          <time>
            {dateTime(h.createdAt)}
            {h.changedByName ? ` · ${h.changedByName}` : ''}
          </time>
        </li>
      ))}
    </ol>
  )
}
