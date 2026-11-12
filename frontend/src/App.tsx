import { Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import { EmptyState } from './components/ui'
import AccountPage from './pages/AccountPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import BookingDetailPage from './pages/BookingDetailPage'
import BookingPage from './pages/BookingPage'
import HomePage from './pages/HomePage'
import MenuDetailPage from './pages/MenuDetailPage'
import MenusPage from './pages/MenusPage'
import MyBookingsPage from './pages/MyBookingsPage'
import ServicesPage from './pages/ServicesPage'

function NotFound() {
  return (
    <div className="container section">
      <EmptyState
        title="Không tìm thấy trang"
        action={
          <Link to="/" className="btn btn-primary btn-sm">
            Về trang chủ
          </Link>
        }
      >
        Đường dẫn không tồn tại hoặc đã thay đổi.
      </EmptyState>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="dich-vu" element={<ServicesPage />} />
        <Route path="thuc-don" element={<MenusPage />} />
        <Route path="thuc-don/:slug" element={<MenuDetailPage />} />
        <Route path="dat-tiec" element={<BookingPage />} />
        <Route path="dang-nhap" element={<LoginPage />} />
        <Route path="dang-ky" element={<RegisterPage />} />
        <Route
          path="don-cua-toi"
          element={
            <RequireAuth roles={['CUSTOMER']}>
              <MyBookingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="don-cua-toi/:id"
          element={
            <RequireAuth roles={['CUSTOMER']}>
              <BookingDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="tai-khoan"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
