import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../../api/client'
import { useApi } from '../../api/useApi'
import type { AssignmentFull } from '../../api/types'
import { AdminHeader } from '../../components/AdminLayout'
import { StatusBadge } from '../../components/BookingParts'
import { Alert, Badge, EmptyState, ErrorState, Modal, Spinner } from '../../components/ui'
import WeekCalendar, { addDays, startOfWeek } from '../../components/WeekCalendar'
import { dateShort, time, timeRange, toDateInput } from '../../utils/format'
import { SKILLS, TASK_NEXT_LABEL, TASK_STATUS } from '../../utils/labels'

function TaskCard({ a }: { a: AssignmentFull }) {
  return (
    <Link to={`/nhan-vien/viec/${a.id}`} className={`card task-card st-${a.status.toLowerCase()}`}>
      <div className="task-date">
        <strong>{new Date(a.shiftStart).getDate()}</strong>
        <span>Th{new Date(a.shiftStart).getMonth() + 1}</span>
      </div>
      <div className="task-body">
        <div className="row" style={{ gap: 6 }}>
          <Badge tone={TASK_STATUS[a.status]?.tone}>{TASK_STATUS[a.status]?.label}</Badge>
          <span className="small muted">#{a.bookingCode}</span>
        </div>
        <h3>
          {SKILLS[a.taskRole]} · {a.task}
        </h3>
        <div className="small">
          🕒 Ca {time(a.shiftStart)} – {time(a.shiftEnd)} · khai tiệc {time(a.partyStart)}
        </div>
        <div className="small muted">📍 {a.address}</div>
      </div>
      <span className="chev">›</span>
    </Link>
  )
}

export function StaffHomePage() {
  const { data, loading, error, reload } = useApi<AssignmentFull[]>('/api/staff/assignments')
  const [tab, setTab] = useState<'upcoming' | 'done' | 'all'>('upcoming')
  const today = toDateInput(new Date())

  const groups = useMemo(() => {
    const list = data ?? []
    const active = list.filter((a) => a.status !== 'DONE' && a.status !== 'CANCELLED')
    return {
      today: active.filter((a) => a.shiftStart.slice(0, 10) <= today && a.shiftEnd.slice(0, 10) >= today),
      upcoming: active.filter((a) => a.shiftStart.slice(0, 10) > today),
      overdue: active.filter((a) => a.shiftEnd.slice(0, 10) < today),
      done: list.filter((a) => a.status === 'DONE' || a.status === 'CANCELLED').reverse(),
    }
  }, [data, today])

  return (
    <>
      <AdminHeader title="Việc của tôi" subtitle="Lịch làm việc, địa điểm và nhiệm vụ được giao. Cập nhật tiến độ ngay trên điện thoại." />
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="stack">
          <div className="chips" style={{ margin: 0 }}>
            <button className={`chip ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
              Sắp tới ({groups.today.length + groups.upcoming.length + groups.overdue.length})
            </button>
            <button className={`chip ${tab === 'done' ? 'active' : ''}`} onClick={() => setTab('done')}>
              Đã xong / hủy ({groups.done.length})
            </button>
          </div>
          {tab === 'upcoming' ? (
            <>
              {groups.overdue.length > 0 && (
                <section>
                  <h2 className="group-title">Chưa báo hoàn thành</h2>
                  <div className="stack">{groups.overdue.map((a) => <TaskCard key={a.id} a={a} />)}</div>
                </section>
              )}
              <section>
                <h2 className="group-title">Hôm nay · {dateShort(today)}</h2>
                {groups.today.length ? (
                  <div className="stack">{groups.today.map((a) => <TaskCard key={a.id} a={a} />)}</div>
                ) : (
                  <p className="muted small">Hôm nay bạn không có ca nào.</p>
                )}
              </section>
              <section>
                <h2 className="group-title">Sắp tới</h2>
                {groups.upcoming.length ? (
                  <div className="stack">{groups.upcoming.map((a) => <TaskCard key={a.id} a={a} />)}</div>
                ) : (
                  <EmptyState title="Chưa có ca sắp tới">Điều phối viên sẽ phân công và việc sẽ hiện ở đây.</EmptyState>
                )}
              </section>
            </>
          ) : groups.done.length ? (
            <div className="stack">{groups.done.map((a) => <TaskCard key={a.id} a={a} />)}</div>
          ) : (
            <EmptyState title="Chưa có việc đã hoàn thành" />
          )}
        </div>
      )}
    </>
  )
}

export function StaffTaskPage() {
  const { id } = useParams()
  const { data: a, loading, error, reload, setData } = useApi<AssignmentFull>(`/api/staff/assignments/${id}`)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  if (loading && !a) return <Spinner />
  if (error || !a)
    return (
      <>
        <ErrorState message={error ?? 'Không tìm thấy công việc'} onRetry={reload} />
        <p style={{ textAlign: 'center' }}>
          <Link to="/nhan-vien">← Việc của tôi</Link>
        </p>
      </>
    )

  async function advance(to: string) {
    setBusy(true)
    setMsg(null)
    try {
      setData(await api<AssignmentFull>(`/api/staff/assignments/${a!.id}/status`, { body: { status: to } }))
      setMsg({ tone: 'ok', text: `Đã cập nhật: ${TASK_STATUS[to].label}.` })
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const steps = ['ASSIGNED', 'CONFIRMED', 'IN_PROGRESS', 'DONE']
  const idx = steps.indexOf(a.status)

  return (
    <>
      <AdminHeader
        title={`${SKILLS[a.taskRole]} · #${a.bookingCode}`}
        subtitle={
          <>
            <Link to="/nhan-vien">Việc của tôi</Link> / {a.task}
          </>
        }
      />
      <div className="detail-grid admin-detail">
        <div className="stack">
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <div className="card card-pad">
            <div className="row">
              <Badge tone={TASK_STATUS[a.status]?.tone}>{TASK_STATUS[a.status]?.label}</Badge>
              <span className="small muted">Tiệc:</span>
              <StatusBadge status={a.bookingStatus} />
            </div>
            {a.status !== 'CANCELLED' && (
              <div className="progress-flow" style={{ marginTop: 14 }}>
                {steps.map((s, i) => (
                  <div key={s} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
                    {TASK_STATUS[s].label}
                  </div>
                ))}
              </div>
            )}
            {a.status === 'CANCELLED' && <Alert tone="info">Phân công này đã bị hủy. Bạn không cần đến tiệc này.</Alert>}
            {a.nextStatuses.length > 0 && (
              <div className="task-actions">
                {a.nextStatuses.map((n) => (
                  <button key={n} className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={() => (n === 'DONE' ? setConfirm(n) : advance(n))}>
                    {busy ? 'Đang cập nhật…' : TASK_NEXT_LABEL[n]}
                  </button>
                ))}
                <p className="small muted" style={{ margin: 0 }}>
                  Bạn chỉ cập nhật nhiệm vụ của mình. Đơn tiệc chỉ hoàn tất khi điều phối xác nhận.
                </p>
              </div>
            )}
          </div>
          <div className="card card-pad">
            <h3>Ca làm & nhiệm vụ</h3>
            <dl className="kv" style={{ margin: 0 }}>
              <dt>Ca làm</dt>
              <dd>
                <strong>{timeRange(a.shiftStart, a.shiftEnd)}</strong>
                <div className="small muted">Đã gồm thời gian chuẩn bị & thu dọn</div>
              </dd>
              <dt>Giờ khai tiệc</dt>
              <dd>{timeRange(a.partyStart, a.partyEnd)}</dd>
              <dt>Nhiệm vụ</dt>
              <dd>{a.task}</dd>
              {a.note && (
                <>
                  <dt>Ghi chú điều phối</dt>
                  <dd>{a.note}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
        <aside className="stack">
          <div className="card card-pad">
            <h3>Địa điểm & khách</h3>
            <dl className="kv" style={{ margin: 0 }}>
              <dt>Địa chỉ</dt>
              <dd>
                {a.address}
                <div>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}`} target="_blank" rel="noreferrer" className="small">
                    Mở bản đồ ↗
                  </a>
                </div>
              </dd>
              <dt>Liên hệ</dt>
              <dd>
                {a.contactName}
                <div>
                  <a href={`tel:${a.contactPhone}`}>{a.contactPhone}</a>
                </div>
              </dd>
              <dt>Tiệc</dt>
              <dd>
                {a.serviceName} · {a.menuName}
                <div className="small muted">
                  {a.guestCount} khách{a.tableCount ? ` · ${a.tableCount} bàn` : ''}
                </div>
              </dd>
            </dl>
            {a.bookingNote && <p className="small" style={{ marginTop: 10 }}>Ghi chú khách: {a.bookingNote}</p>}
          </div>
          <div className="card card-pad">
            <h3>Cùng ca</h3>
            {a.teammates.length ? (
              <ul className="plain-list">
                {a.teammates.map((t, i) => (
                  <li key={i}>
                    <span>
                      <strong>{t.name}</strong> · {SKILLS[t.taskRole]}
                      <div className="small muted">{t.task}</div>
                    </span>
                    {t.phone && (
                      <a href={`tel:${t.phone}`} className="small">
                        {t.phone}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Chưa có đồng nghiệp khác.</p>
            )}
          </div>
        </aside>
      </div>
      {confirm && (
        <Modal title="Báo hoàn thành nhiệm vụ?" onClose={() => setConfirm(null)} busy={busy}>
          <p>Xác nhận bạn đã hoàn thành “{a.task}”. Không thể hoàn tác trên ứng dụng.</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>
              Chưa
            </button>
            <button className="btn btn-primary" onClick={() => advance(confirm)} disabled={busy}>
              Đã hoàn thành
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function StaffWeekPage() {
  const [anchor, setAnchor] = useState(() => new Date())
  const days = useMemo(() => {
    const s = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
  }, [anchor])
  const from = toDateInput(days[0])
  const to = toDateInput(days[6])
  const { data, loading, error, reload } = useApi<AssignmentFull[]>(`/api/staff/assignments?from=${from}&to=${to}`)
  return (
    <>
      <AdminHeader title="Lịch tuần" subtitle={`${dateShort(from)} – ${dateShort(to)}`} />
      <div className="toolbar">
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(addDays(anchor, -7))}>
            ← Tuần trước
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(new Date())}>
            Tuần này
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(addDays(anchor, 7))}>
            Tuần sau →
          </button>
        </div>
      </div>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className={loading ? 'is-loading' : ''}>
          <WeekCalendar days={days} items={(data ?? []).filter((a) => a.status !== 'CANCELLED')} linkTo={(a) => `/nhan-vien/viec/${a.id}`} showStaff={false} />
        </div>
      )}
    </>
  )
}
