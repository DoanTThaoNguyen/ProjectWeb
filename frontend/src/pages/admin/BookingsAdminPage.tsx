import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApi } from '../../api/useApi'
import type { BookingStatus, BookingSummary, Page } from '../../api/types'
import { AdminHeader } from '../../components/AdminLayout'
import { StatusBadge } from '../../components/BookingParts'
import { Badge, EmptyState, ErrorState, Pagination, Spinner } from '../../components/ui'
import { dateShort, money, time } from '../../utils/format'
import { ASSIGNMENT_STATUS, BOOKING_STATUS, PAYMENT_STATUS } from '../../utils/labels'

export default function BookingsAdminPage() {
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const status = sp.get('status') ?? ''
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const cancelRequested = sp.get('cancelRequested') === 'true'
  const sort = sp.get('sort') ?? ''
  const page = Number(sp.get('page') ?? 0)

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v)
    else n.delete(k)
    if (k !== 'page') n.delete('page')
    setSp(n, { replace: true })
  }

  // Tim kiem tu dong sau khi ngung go 350ms
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get('q') ?? '') !== q.trim()) set('q', q.trim())
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const qs = new URLSearchParams({ page: String(page), size: '12' })
  if (sp.get('q')) qs.set('q', sp.get('q')!)
  if (status) qs.set('status', status)
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  if (cancelRequested) qs.set('cancelRequested', 'true')
  if (sort) qs.set('sort', sort)
  const { data, loading, error, reload } = useApi<Page<BookingSummary>>(`/api/coord/bookings?${qs}`)
  const filtered = !!(sp.get('q') || status || from || to || cancelRequested)

  return (
    <>
      <AdminHeader title="Đơn tiệc" subtitle="Tiếp nhận yêu cầu, báo giá, theo dõi thanh toán và phân công." />
      <div className="card card-pad">
        <div className="filters-row">
          <input
            className="input"
            placeholder="Tìm mã đơn, tên, SĐT, email khách…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm kiếm"
            style={{ flex: '2 1 220px' }}
          />
          <select className="input" value={status} onChange={(e) => set('status', e.target.value)} aria-label="Trạng thái" style={{ flex: '1 1 160px' }}>
            <option value="">Mọi trạng thái</option>
            {(Object.keys(BOOKING_STATUS) as BookingStatus[]).map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS[s].label}
              </option>
            ))}
          </select>
          <label className="inline-field">
            <span>Ngày tiệc từ</span>
            <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => set('from', e.target.value)} />
          </label>
          <label className="inline-field">
            <span>đến</span>
            <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => set('to', e.target.value)} />
          </label>
          <select className="input" value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sắp xếp" style={{ flex: '1 1 150px' }}>
            <option value="">Mới gửi trước</option>
            <option value="start_asc">Ngày tiệc gần nhất</option>
            <option value="start_desc">Ngày tiệc xa nhất</option>
          </select>
          <label className="check" style={{ whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={cancelRequested} onChange={(e) => set('cancelRequested', e.target.checked ? 'true' : '')} />
            Có yêu cầu hủy
          </label>
          {filtered && (
            <button
              className="link-btn small"
              onClick={() => {
                setQ('')
                setSp(new URLSearchParams(), { replace: true })
              }}
            >
              Xóa lọc
            </button>
          )}
        </div>

        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={filtered ? 'Không có đơn phù hợp bộ lọc' : 'Chưa có đơn tiệc nào'}>
            {filtered ? 'Thử bỏ bớt điều kiện lọc.' : 'Khi khách gửi yêu cầu, đơn sẽ hiện ở đây.'}
          </EmptyState>
        ) : (
          <>
            <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách / liên hệ</th>
                    <th>Ngày tiệc</th>
                    <th>Tiệc</th>
                    <th>Trạng thái</th>
                    <th>Thanh toán</th>
                    <th>Nhân sự</th>
                    <th className="r">Giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((b) => (
                    <tr key={b.id} onClick={() => nav(`/quan-tri/don/${b.id}`)} className="clickable">
                      <td>
                        <Link to={`/quan-tri/don/${b.id}`} onClick={(e) => e.stopPropagation()}>
                          <strong>#{b.code}</strong>
                        </Link>
                        <div className="small muted">Gửi {dateShort(b.createdAt)}</div>
                      </td>
                      <td>
                        {b.contactName}
                        <div className="small muted">{b.contactPhone}</div>
                      </td>
                      <td className="nowrap">
                        {dateShort(b.startTime)}
                        <div className="small muted">
                          {time(b.startTime)} – {time(b.endTime)}
                        </div>
                      </td>
                      <td>
                        {b.serviceName}
                        <div className="small muted">
                          {b.guestCount} khách{b.tableCount ? ` · ${b.tableCount} bàn` : ''}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                        {b.cancelRequested && b.status !== 'CANCELLED' && (
                          <div style={{ marginTop: 4 }}>
                            <Badge tone="danger">Yêu cầu hủy</Badge>
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge tone={PAYMENT_STATUS[b.paymentStatus]?.tone}>{PAYMENT_STATUS[b.paymentStatus]?.label}</Badge>
                      </td>
                      <td>
                        <Badge tone={ASSIGNMENT_STATUS[b.assignmentStatus]?.tone}>{ASSIGNMENT_STATUS[b.assignmentStatus]?.label}</Badge>
                      </td>
                      <td className="r nowrap">
                        {money(b.quotedTotal ?? b.estimatedTotal)}
                        <div className="small muted">{b.quotedTotal != null ? 'báo giá' : 'tạm tính'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onPage={(p) => set('page', String(p))} />
          </>
        )}
      </div>
    </>
  )
}
