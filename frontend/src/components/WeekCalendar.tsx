import { Link } from 'react-router-dom'
import type { AssignmentFull } from '../api/types'
import { time, toDateInput } from '../utils/format'
import { SKILLS, TASK_STATUS } from '../utils/labels'

export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // Thu 2 = 0
  x.setDate(x.getDate() - dow)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Lich theo cot ngay; moi the la mot ca lam (gom chuan bi + thu don). */
export default function WeekCalendar({
  days,
  items,
  linkTo,
  showStaff,
}: {
  days: Date[]
  items: AssignmentFull[]
  linkTo: (a: AssignmentFull) => string
  showStaff: boolean
}) {
  const today = toDateInput(new Date())
  return (
    <div className={`cal ${days.length === 1 ? 'cal-day' : ''}`}>
      {days.map((d) => {
        const key = toDateInput(d)
        const list = items.filter((a) => a.shiftStart.slice(0, 10) <= key && a.shiftEnd.slice(0, 10) >= key)
        return (
          <div key={key} className={`cal-col ${key === today ? 'is-today' : ''}`}>
            <div className="cal-head">
              <span>{WD[(d.getDay() + 6) % 7]}</span>
              <strong>
                {d.getDate()}/{d.getMonth() + 1}
              </strong>
            </div>
            <div className="cal-body">
              {list.length === 0 && <span className="cal-empty">—</span>}
              {list.map((a) => (
                <Link key={a.id} to={linkTo(a)} className={`cal-item st-${a.status.toLowerCase()}`}>
                  <span className="cal-time">
                    {time(a.shiftStart)}–{time(a.shiftEnd)}
                  </span>
                  <strong>{showStaff ? a.staffName : `#${a.bookingCode}`}</strong>
                  <span className="cal-sub">
                    {SKILLS[a.taskRole]} · {showStaff ? `#${a.bookingCode}` : a.serviceName}
                  </span>
                  <span className="cal-sub">Khai tiệc {time(a.partyStart)}</span>
                  <span className={`cal-status badge badge-${TASK_STATUS[a.status]?.tone}`}>{TASK_STATUS[a.status]?.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { WD }
