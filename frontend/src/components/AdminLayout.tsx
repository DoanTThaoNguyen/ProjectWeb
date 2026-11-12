import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { BRAND } from '../config'
import { ROLE_LABEL } from '../utils/labels'

type NavItem = { to: string; label: string; icon: string; end?: boolean; roles?: Role[] }

const BACKOFFICE_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Điều phối',
    items: [
      { to: '/quan-tri', label: 'Tổng quan', icon: '◫', end: true },
      { to: '/quan-tri/don', label: 'Đơn tiệc', icon: '☰' },
      { to: '/quan-tri/lich', label: 'Lịch phân công', icon: '▦' },
      { to: '/quan-tri/nhan-vien', label: 'Nhân viên', icon: '☺' },
    ],
  },
  {
    group: 'Quản trị',
    items: [
      { to: '/quan-tri/thuc-don', label: 'Thực đơn', icon: '◧', roles: ['ADMIN'] },
      { to: '/quan-tri/mon-an', label: 'Món ăn', icon: '◔', roles: ['ADMIN'] },
      { to: '/quan-tri/dich-vu', label: 'Dịch vụ & hình thức', icon: '✚', roles: ['ADMIN'] },
      { to: '/quan-tri/tai-khoan', label: 'Tài khoản', icon: '⚿', roles: ['ADMIN'] },
      { to: '/quan-tri/cau-hinh', label: 'Cấu hình & nhật ký', icon: '⚙', roles: ['ADMIN'] },
    ],
  },
]

const STAFF_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Công việc',
    items: [
      { to: '/nhan-vien', label: 'Việc của tôi', icon: '☰', end: true },
      { to: '/nhan-vien/lich', label: 'Lịch tuần', icon: '▦' },
    ],
  },
]

export default function AdminLayout({ area }: { area: 'backoffice' | 'staff' }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [loc.pathname])

  const groups = (area === 'staff' ? STAFF_NAV : BACKOFFICE_NAV)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || (user && i.roles.includes(user.role))) }))
    .filter((g) => g.items.length)

  return (
    <div className={`admin ${open ? 'side-open' : ''}`}>
      <aside className="admin-side" aria-label="Menu quản trị">
        <Link to="/" className="admin-brand">
          <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden>
            <circle cx="32" cy="32" r="30" fill="#d6b25f" />
            <path d="M14 38h36a18 18 0 0 0-36 0z" fill="#153b2c" />
            <rect x="10" y="40" width="44" height="5" rx="2.5" fill="#f6f4ec" />
          </svg>
          <span>
            {BRAND.name}
            <small>{area === 'staff' ? 'Khu nhân viên' : 'Khu điều phối'}</small>
          </span>
        </Link>
        <nav>
          {groups.map((g) => (
            <div key={g.group} className="admin-nav-group">
              <div className="admin-nav-title">{g.group}</div>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end}>
                  <span className="ico" aria-hidden>
                    {i.icon}
                  </span>
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-side-foot">
          <Link to={area === 'staff' ? '/nhan-vien/tai-khoan' : '/quan-tri/ca-nhan'}>Thông tin tài khoản</Link>
          <br />
          <Link to="/">← Về trang khách hàng</Link>
        </div>
      </aside>
      <div className="admin-scrim" onClick={() => setOpen(false)} aria-hidden />
      <div className="admin-main">
        <header className="admin-top">
          <button className="burger admin-burger" onClick={() => setOpen((o) => !o)} aria-label="Mở menu" aria-expanded={open}>
            <span />
            <span />
            <span />
          </button>
          <span className="spacer" />
          {user && (
            <div className="admin-user">
              <span className="avatar">{user.fullName.trim().charAt(0).toUpperCase()}</span>
              <span className="admin-user-name">
                <strong>{user.fullName}</strong>
                <small>{ROLE_LABEL[user.role]}</small>
              </span>
              <Link to={area === 'staff' ? '/nhan-vien/tai-khoan' : '/quan-tri/ca-nhan'} className="btn btn-ghost btn-sm">
                Tài khoản
              </Link>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  logout()
                  nav('/dang-nhap')
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function AdminHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="admin-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  )
}
