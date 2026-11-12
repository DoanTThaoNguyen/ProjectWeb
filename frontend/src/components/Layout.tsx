import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, homeFor } from '../auth/AuthContext'
import { BRAND } from '../config'
import { ROLE_LABEL } from '../utils/labels'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''}`} aria-label={BRAND.name}>
      <svg viewBox="0 0 64 64" width="38" height="38" aria-hidden>
        <circle cx="32" cy="32" r="30" fill="#153b2c" />
        <path d="M14 38h36a18 18 0 0 0-36 0z" fill="#d6b25f" />
        <rect x="10" y="40" width="44" height="5" rx="2.5" fill="#f6f4ec" />
        <circle cx="32" cy="17" r="3" fill="#d6b25f" />
      </svg>
      <span className="logo-text">{BRAND.name}</span>
    </Link>
  )
}

function Header() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [loc.pathname])

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container topbar-inner">
          <span>Phục vụ {BRAND.serviceArea}</span>
          <a href={BRAND.hotlineHref}>Hotline: {BRAND.hotline}</a>
        </div>
      </div>
      <div className="container header-inner">
        <Logo />
        <nav className={`main-nav ${open ? 'open' : ''}`} aria-label="Điều hướng chính">
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          <NavLink to="/dich-vu">Dịch vụ</NavLink>
          <NavLink to="/thuc-don">Thực đơn</NavLink>
          <Link to="/#quy-trinh">Quy trình</Link>
          {user?.role === 'CUSTOMER' && <NavLink to="/don-cua-toi">Đơn của tôi</NavLink>}
          {user && user.role !== 'CUSTOMER' && <NavLink to={homeFor(user)}>Khu làm việc</NavLink>}
          <Link to="/dat-tiec" className="btn btn-primary nav-cta">
            Đặt tiệc ngay
          </Link>
        </nav>
        <div className="header-actions">
          {user ? (
            <div className="account">
              <button className="account-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                <span className="avatar">{user.fullName.trim().charAt(0).toUpperCase()}</span>
                <span className="account-name">{user.fullName.split(' ').slice(-1)[0]}</span>
              </button>
              {menu && (
                <div className="account-menu" role="menu">
                  <div className="account-head">
                    <strong>{user.fullName}</strong>
                    <small>{ROLE_LABEL[user.role]}</small>
                  </div>
                  {user.role === 'CUSTOMER' && <Link to="/don-cua-toi">Đơn của tôi</Link>}
                  {user.role !== 'CUSTOMER' && <Link to={homeFor(user)}>Khu làm việc</Link>}
                  <Link to="/tai-khoan">Thông tin tài khoản</Link>
                  <button
                    onClick={() => {
                      logout()
                      nav('/')
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/dang-nhap" state={{ from: loc.pathname }} className="btn btn-ghost btn-sm">
              Đăng nhập
            </Link>
          )}
          <Link to="/dat-tiec" className="btn btn-primary btn-sm header-cta">
            Đặt tiệc ngay
          </Link>
          <button className="burger" onClick={() => setOpen((o) => !o)} aria-label="Mở menu" aria-expanded={open}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer" id="lien-he">
      <div className="container footer-grid">
        <div>
          <Logo light />
          <p className="footer-about">{BRAND.slogan}. Đầu bếp nấu tại bếp nhà bạn, setup bàn tiệc, phục vụ và dọn dẹp sau tiệc.</p>
        </div>
        <div>
          <h4>Dịch vụ</h4>
          <Link to="/thuc-don?service=TIEC_BAN">Tiệc bàn truyền thống</Link>
          <Link to="/thuc-don?service=BUFFET">Buffet tại gia</Link>
          <Link to="/thuc-don?service=BBQ">Tiệc nướng BBQ</Link>
          <Link to="/thuc-don?service=TEABREAK">Teabreak & tiệc nhẹ</Link>
        </div>
        <div>
          <h4>Hỗ trợ</h4>
          <Link to="/#quy-trinh">Quy trình đặt tiệc</Link>
          <Link to="/#hoi-dap">Câu hỏi thường gặp</Link>
          <Link to="/don-cua-toi">Tra cứu đơn của tôi</Link>
        </div>
        <div>
          <h4>Liên hệ</h4>
          <a href={BRAND.hotlineHref}>Hotline: {BRAND.hotline}</a>
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          <span>{BRAND.address}</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {BRAND.name}. Đồ án sinh viên – mọi giá, liên hệ và đơn hàng là dữ liệu demo.</span>
      </div>
    </footer>
  )
}

export default function Layout() {
  const loc = useLocation()
  useEffect(() => {
    if (loc.hash) {
      const el = document.getElementById(loc.hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [loc.pathname, loc.hash])
  const hideFloat = loc.pathname.startsWith('/dat-tiec')
  return (
    <div className="app">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      {!hideFloat && (
        <div className="mobile-cta">
          <a href={BRAND.hotlineHref} className="btn btn-outline">
            Gọi tư vấn
          </a>
          <Link to="/dat-tiec" className="btn btn-primary">
            Đặt tiệc ngay
          </Link>
        </div>
      )}
    </div>
  )
}
