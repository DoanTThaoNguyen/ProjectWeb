import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../api/useApi'
import type { BookingStatus, Dashboard } from '../../api/types'
import { AdminHeader } from '../../components/AdminLayout'
import { StatusBadge } from '../../components/BookingParts'
import { EmptyState, ErrorState, Spinner } from '../../components/ui'
import { money, moneyShort, timeRange, toDateInput } from '../../utils/format'
import { ASSIGNMENT_STATUS, BOOKING_STATUS, PAYMENT_STATUS } from '../../utils/labels'

function monthRange(offset = 0): [string, string] {
  const d = new Date()
  const f = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  const t = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0)
  return [toDateInput(f), toDateInput(t)]
}

const PRESETS: { k: string; label: string; range: () => [string, string] }[] = [
  { k: 'this', label: 'Tháng này', range: () => monthRange(0) },
  { k: 'last', label: 'Tháng trước', range: () => monthRange(-1) },
  {
    k: 'q',
    label: '3 tháng gần đây',
    range: () => [monthRange(-2)[0], monthRange(0)[1]],
  },
  {
    k: 'y',
    label: 'Năm nay',
    range: () => [`${new Date().getFullYear()}-01-01`, `${new Date().getFullYear()}-12-31`],
  },
]

function Stat({ label, value, basis, tone, to }: { label: string; value: string; basis: string; tone?: string; to?: string }) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <strong className={`stat-value ${tone ?? ''}`}>{value}</strong>
      <span className="stat-basis">{basis}</span>
    </>
  )
  return to ? (
    <Link to={to} className="card stat stat-link">
      {body}
    </Link>
  ) : (
    <div className="card stat">{body}</div>
  )
}

/** Bieu do cot mot chuoi: mot mau, tooltip khi re chuot, co che do xem bang. */
function BarChart({ title, basis, points, value }: { title: string; basis: string; points: Dashboard['series']; value: (p: Dashboard['series'][number]) => number }) {
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...points.map(value))
  const step = points.length > 16 ? Math.ceil(points.length / 8) : 1
  const label = (l: string) => (l.length === 10 ? `${l.slice(8, 10)}/${l.slice(5, 7)}` : `T${Number(l.slice(5, 7))}/${l.slice(2, 4)}`)
  const total = points.reduce((a, p) => a + value(p), 0)
  return (
    <div className="card card-pad chart-card">
      <div className="chart-head">
        <div>
          <h3>{title}</h3>
          <span className="muted small">
            {basis} · Tổng {money(total)}
          </span>
        </div>
        <button className="link-btn small" onClick={() => setTable((t) => !t)}>
          {table ? 'Xem biểu đồ' : 'Xem dạng bảng'}
        </button>
      </div>
      {table ? (
        <div className="table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th className="r">Giá trị</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.label}>
                  <td>{label(p.label)}</td>
                  <td className="r">{money(value(p))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : total === 0 ? (
        <p className="muted small" style={{ padding: '40px 0', textAlign: 'center' }}>
          Chưa có số liệu trong khoảng thời gian này.
        </p>
      ) : (
        <div className="bars" role="img" aria-label={`${title}, tổng ${money(total)}`}>
          <div className="bars-grid" aria-hidden>
            <span>{moneyShort(max)}</span>
            <span>{moneyShort(max / 2)}</span>
            <span>0</span>
          </div>
          <div className="bars-plot">
            {points.map((p, i) => {
              const v = value(p)
              return (
                <div className="bar-col" key={p.label} tabIndex={0}>
                  <div className="bar" style={{ height: `${(v / max) * 100}%` }} />
                  <div className="bar-tip" role="tooltip">
                    <strong>{label(p.label)}</strong>
                    {money(v)}
                  </div>
                  <span className="bar-x">{i % step === 0 ? label(p.label) : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [preset, setPreset] = useState('this')
  const [range, setRange] = useState<[string, string]>(monthRange(0))
  const { data: d, loading, error, reload } = useApi<Dashboard>(`/api/coord/dashboard?from=${range[0]}&to=${range[1]}`)

  const statuses = Object.keys(BOOKING_STATUS) as BookingStatus[]
  const maxCount = d ? Math.max(1, ...statuses.map((s) => d.statusCounts[s] ?? 0)) : 1

  return (
    <>
      <AdminHeader title="Tổng quan" subtitle="Tình hình đặt tiệc, tiền thu và lịch sắp tới." />
      <div className="toolbar">
        <div className="chips" style={{ margin: 0 }}>
          {PRESETS.map((p) => (
            <button
              key={p.k}
              className={`chip ${preset === p.k ? 'active' : ''}`}
              onClick={() => {
                setPreset(p.k)
                setRange(p.range())
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <input
            type="date"
            className="input input-sm"
            value={range[0]}
            max={range[1]}
            onChange={(e) => {
              setPreset('')
              if (e.target.value) setRange([e.target.value, range[1]])
            }}
            aria-label="Từ ngày"
          />
          <span className="muted">→</span>
          <input
            type="date"
            className="input input-sm"
            value={range[1]}
            min={range[0]}
            onChange={(e) => {
              setPreset('')
              if (e.target.value) setRange([range[0], e.target.value])
            }}
            aria-label="Đến ngày"
          />
        </div>
      </div>

      {loading && !d ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : d ? (
        <div className={`stack ${loading ? 'is-loading' : ''}`}>
          <div className="stat-grid">
            <Stat label="Yêu cầu mới trong kỳ" value={String(d.newRequests)} basis="Theo ngày khách gửi yêu cầu" />
            <Stat label="Đang chờ tiếp nhận" value={String(d.pendingNew)} basis="Hiện tại, mọi ngày tổ chức" tone="warn" to="/quan-tri/don?status=NEW" />
            <Stat label="Chờ khách đặt cọc" value={String(d.awaitingDeposit)} basis="Hiện tại" to="/quan-tri/don?status=AWAITING_DEPOSIT" />
            <Stat
              label="Yêu cầu hủy chờ xử lý"
              value={String(d.pendingCancelRequests)}
              basis="Hiện tại"
              tone={d.pendingCancelRequests ? 'danger' : ''}
              to="/quan-tri/don?cancelRequested=true"
            />
          </div>
          <div className="stat-grid">
            <Stat label="Tổng giá trị đơn" value={money(d.orderValue)} basis="Báo giá đã chấp nhận · theo ngày tổ chức · trừ đơn hủy" />
            <Stat label="Doanh thu tiệc hoàn tất" value={money(d.completedRevenue)} basis="Đơn đã hoàn tất · theo ngày tổ chức" tone="ok" />
            <Stat
              label="Tiền đã thu"
              value={money(d.collected)}
              basis={`Cọc ${money(d.depositCollected)} + còn lại ${money(d.balanceCollected)} · theo ngày giao dịch`}
            />
            <Stat label="Tiền đã hoàn" value={money(d.refunded)} basis={`Theo ngày giao dịch · thực thu ròng ${money(d.netCollected)}`} tone={d.refunded ? 'danger' : ''} />
            <Stat label="Còn phải thu" value={money(d.receivable)} basis="Đơn tổ chức trong kỳ, chưa hủy: giá trị − đã thu ròng" tone="warn" />
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Giá trị đơn và tiền đã thu là hai chỉ số khác nhau, không cộng với nhau. Tiền cọc chỉ được tính một lần trong “Tiền đã thu”. Chỉ “Doanh thu tiệc
            hoàn tất” được coi là doanh thu.
          </p>

          <div className="grid grid-2">
            <BarChart title="Giá trị đơn" basis="Theo ngày tổ chức tiệc" points={d.series} value={(p) => Number(p.orderValue)} />
            <BarChart title="Tiền thực thu (đã trừ hoàn)" basis="Theo ngày giao dịch" points={d.series} value={(p) => Math.max(0, Number(p.collected))} />
          </div>

          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div className="card card-pad">
              <h3>Số tiệc theo trạng thái</h3>
              <p className="muted small" style={{ marginTop: -6 }}>
                Theo ngày tổ chức trong kỳ · tổng {d.eventsInRange} đơn
              </p>
              <div className="hbars">
                {statuses.map((s) => {
                  const n = d.statusCounts[s] ?? 0
                  return (
                    <Link key={s} to={`/quan-tri/don?status=${s}&from=${range[0]}&to=${range[1]}`} className="hbar">
                      <span className="hbar-label">{BOOKING_STATUS[s].label}</span>
                      <span className="hbar-track">
                        <span className="hbar-fill" style={{ width: `${(n / maxCount) * 100}%` }} />
                      </span>
                      <span className="hbar-n">{n}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="card card-pad">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Tiệc sắp diễn ra (14 ngày)</h3>
                <Link to="/quan-tri/lich" className="small">
                  Xem lịch →
                </Link>
              </div>
              {d.upcoming.length === 0 ? (
                <EmptyState title="Không có tiệc sắp diễn ra" />
              ) : (
                <ul className="upcoming">
                  {d.upcoming.map((u) => (
                    <li key={u.id}>
                      <Link to={`/quan-tri/don/${u.id}`}>
                        <div className="row" style={{ gap: 6 }}>
                          <strong>#{u.code}</strong>
                          <StatusBadge status={u.status} />
                          {u.assignmentStatus === 'UNASSIGNED' && (
                            <span className="badge badge-danger">{ASSIGNMENT_STATUS.UNASSIGNED.label}</span>
                          )}
                          {u.status === 'AWAITING_DEPOSIT' && <span className="badge badge-warn">{PAYMENT_STATUS[u.paymentStatus]?.label}</span>}
                        </div>
                        <div className="small">
                          {timeRange(u.startTime, u.endTime)} · {u.serviceName} · {u.guestCount} khách · {u.staffCount} nhân sự
                        </div>
                        <div className="small muted">
                          {u.contactName} – {u.address}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
