import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../api/useApi'
import type { BookingSummary } from '../api/types'
import { StatusBadge } from '../components/BookingParts'
import { EmptyState, ErrorState, Img, PageHeader, Spinner } from '../components/ui'
import { money, timeRange } from '../utils/format'

const TABS = [
  { k: 'active', label: 'Đang xử lý', match: (b: BookingSummary) => !['COMPLETED', 'CANCELLED'].includes(b.status) },
  { k: 'done', label: 'Đã hoàn tất', match: (b: BookingSummary) => b.status === 'COMPLETED' },
  { k: 'cancel', label: 'Đã hủy', match: (b: BookingSummary) => b.status === 'CANCELLED' },
  { k: 'all', label: 'Tất cả', match: () => true },
]

export default function MyBookingsPage() {
  const { data, loading, error, reload } = useApi<BookingSummary[]>('/api/bookings/my')
  const [tab, setTab] = useState('active')
  const t = TABS.find((x) => x.k === tab)!
  const list = (data ?? []).filter(t.match)

  return (
    <>
      <PageHeader title="Yêu cầu & đơn tiệc của tôi" subtitle="Theo dõi báo giá, tiến độ và thanh toán của từng bữa tiệc." crumbs={[{ label: 'Đơn của tôi' }]} />
      <section className="section-tight">
        <div className="container">
          <div className="row" style={{ marginBottom: 20 }}>
            <div className="chips" style={{ margin: 0 }}>
              {TABS.map((x) => (
                <button key={x.k} className={`chip ${tab === x.k ? 'active' : ''}`} onClick={() => setTab(x.k)}>
                  {x.label}
                  {data ? ` (${data.filter(x.match).length})` : ''}
                </button>
              ))}
            </div>
            <span className="spacer" />
            <Link to="/dat-tiec" className="btn btn-primary btn-sm">
              + Đặt tiệc mới
            </Link>
          </div>
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !list.length ? (
            <EmptyState
              title={data!.length ? 'Không có đơn trong mục này' : 'Bạn chưa có yêu cầu đặt tiệc nào'}
              action={
                <Link to="/thuc-don" className="btn btn-primary btn-sm">
                  Xem thực đơn
                </Link>
              }
            >
              {data!.length ? 'Chọn mục khác để xem đơn.' : 'Chọn một thực đơn và gửi yêu cầu, chúng tôi sẽ liên hệ báo giá.'}
            </EmptyState>
          ) : (
            <div className="stack">
              {list.map((b) => (
                <Link key={b.id} to={`/don-cua-toi/${b.id}`} className="card order-card">
                  <Img src={b.menuImage ?? undefined} alt="" />
                  <div>
                    <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                      <StatusBadge status={b.status} />
                      {b.cancelRequested && b.status !== 'CANCELLED' && <span className="badge badge-danger">Đã gửi yêu cầu hủy</span>}
                      <span className="muted small">#{b.code}</span>
                    </div>
                    <h3>
                      {b.menuName} · {b.serviceName}
                    </h3>
                    <div className="order-meta">
                      <span>🕒 {timeRange(b.startTime, b.endTime)}</span>
                      <span>👥 {b.guestCount} khách{b.tableCount ? ` · ${b.tableCount} bàn` : ''}</span>
                      <span>📍 {b.address}</span>
                    </div>
                  </div>
                  <div className="order-right">
                    <div>
                      <div className="small muted">{b.quotedTotal != null ? 'Theo báo giá' : 'Tạm tính'}</div>
                      <div className="price">{money(b.quotedTotal ?? b.estimatedTotal)}</div>
                    </div>
                    <span className="chev">Chi tiết →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
