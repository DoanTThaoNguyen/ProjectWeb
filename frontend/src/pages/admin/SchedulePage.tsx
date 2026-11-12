import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../api/useApi'
import type { AssignmentFull, StaffMember } from '../../api/types'
import { AdminHeader } from '../../components/AdminLayout'
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui'
import WeekCalendar, { addDays, startOfWeek } from '../../components/WeekCalendar'
import { dateShort, time, toDateInput } from '../../utils/format'
import { SKILLS, TASK_STATUS } from '../../utils/labels'

export default function SchedulePage() {
  const [view, setView] = useState<'week' | 'day' | 'list'>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [staffId, setStaffId] = useState('')
  const [showCancelled, setShowCancelled] = useState(false)
  const staff = useApi<StaffMember[]>('/api/coord/staff')

  const days = useMemo(() => {
    if (view === 'day') return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())]
    const s = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
  }, [view, anchor])
  const from = toDateInput(days[0])
  const to = toDateInput(days[days.length - 1])
  const qs = new URLSearchParams({ from, to, includeCancelled: String(showCancelled) })
  if (staffId) qs.set('staffId', staffId)
  const { data, loading, error, reload } = useApi<AssignmentFull[]>(`/api/coord/schedule?${qs}`)
  const step = view === 'day' ? 1 : 7

  const busyStaff = new Set((data ?? []).filter((a) => a.status !== 'CANCELLED').map((a) => a.staffId))
  const activeStaff = (staff.data ?? []).filter((s) => s.active)

  return (
    <>
      <AdminHeader title="Lịch phân công" subtitle="Ca làm đã gồm thời gian chuẩn bị và thu dọn. Bấm vào ca để mở đơn tiệc." />
      <div className="toolbar">
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(addDays(anchor, -step))} aria-label="Trước">
            ←
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(new Date())}>
            Hôm nay
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(addDays(anchor, step))} aria-label="Sau">
            →
          </button>
          <strong style={{ marginLeft: 6 }}>{from === to ? dateShort(from) : `${dateShort(from)} – ${dateShort(to)}`}</strong>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg">
            {(['day', 'week', 'list'] as const).map((v) => (
              <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
                {v === 'day' ? 'Ngày' : v === 'week' ? 'Tuần' : 'Danh sách'}
              </button>
            ))}
          </div>
          <select className="input input-sm" value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Lọc nhân viên">
            <option value="">Tất cả nhân viên</option>
            {(staff.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
                {s.active ? '' : ' (ngừng)'}
              </option>
            ))}
          </select>
          <label className="check small">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Hiện ca đã hủy
          </label>
        </div>
      </div>

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : view === 'list' ? (
        !data?.length ? (
          <EmptyState title="Không có ca làm trong tuần này" />
        ) : (
          <div className="card card-pad">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Ca làm</th>
                    <th>Nhân viên</th>
                    <th>Vai trò / nhiệm vụ</th>
                    <th>Tiệc</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => (
                    <tr key={a.id} className={a.status === 'CANCELLED' ? 'row-muted' : ''}>
                      <td className="nowrap">{dateShort(a.shiftStart)}</td>
                      <td className="nowrap">
                        {time(a.shiftStart)} – {time(a.shiftEnd)}
                      </td>
                      <td>{a.staffName}</td>
                      <td>
                        {SKILLS[a.taskRole]}
                        <div className="small muted">{a.task}</div>
                      </td>
                      <td>
                        <Link to={`/quan-tri/don/${a.bookingId}`}>#{a.bookingCode}</Link>
                        <div className="small muted">
                          {a.serviceName} · khai tiệc {time(a.partyStart)}
                        </div>
                      </td>
                      <td>
                        <Badge tone={TASK_STATUS[a.status]?.tone}>{TASK_STATUS[a.status]?.label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className={loading ? 'is-loading' : ''}>
          <WeekCalendar days={days} items={data ?? []} linkTo={(a) => `/quan-tri/don/${a.bookingId}`} showStaff />
        </div>
      )}

      {!staffId && activeStaff.length > 0 && data && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: '1rem' }}>Nhân viên rảnh trong {view === 'day' ? 'ngày' : 'tuần'} này</h3>
          <div className="row" style={{ gap: 6 }}>
            {activeStaff
              .filter((s) => !busyStaff.has(s.id))
              .map((s) => (
                <span key={s.id} className="badge badge-ok">
                  {s.fullName} · {s.skills.map((k) => SKILLS[k]).join(', ')}
                </span>
              ))}
            {activeStaff.every((s) => busyStaff.has(s.id)) && <span className="muted small">Mọi nhân viên đều có ít nhất một ca.</span>}
          </div>
        </div>
      )}
    </>
  )
}
