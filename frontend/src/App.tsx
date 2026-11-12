import type { ReactNode } from 'react'
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
import AdminLayout from './components/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import BookingsAdminPage from './pages/admin/BookingsAdminPage'
import BookingAdminDetailPage from './pages/admin/BookingAdminDetailPage'
import SchedulePage from './pages/admin/SchedulePage'
import StaffPage from './pages/admin/StaffPage'
import { AddonsAdminPage, DishesAdminPage, MenusAdminPage } from './pages/admin/CatalogPages'
import { SettingsPage, UsersPage } from './pages/admin/UsersPage'
import { StaffHomePage, StaffTaskPage, StaffWeekPage } from './pages/staff/StaffPages'

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

function AdminOnly({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['ADMIN']}>{children}</RequireAuth>
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
      <Route
        path="quan-tri"
        element={
          <RequireAuth roles={['COORDINATOR', 'ADMIN']}>
            <AdminLayout area="backoffice" />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="don" element={<BookingsAdminPage />} />
        <Route path="don/:id" element={<BookingAdminDetailPage />} />
        <Route path="lich" element={<SchedulePage />} />
        <Route path="nhan-vien" element={<StaffPage />} />
        <Route path="ca-nhan" element={<AccountPage />} />
        <Route path="thuc-don" element={<AdminOnly><MenusAdminPage /></AdminOnly>} />
        <Route path="mon-an" element={<AdminOnly><DishesAdminPage /></AdminOnly>} />
        <Route path="dich-vu" element={<AdminOnly><AddonsAdminPage /></AdminOnly>} />
        <Route path="tai-khoan" element={<AdminOnly><UsersPage /></AdminOnly>} />
        <Route path="cau-hinh" element={<AdminOnly><SettingsPage /></AdminOnly>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="nhan-vien"
        element={
          <RequireAuth roles={['STAFF']}>
            <AdminLayout area="staff" />
          </RequireAuth>
        }
      >
        <Route index element={<StaffHomePage />} />
        <Route path="viec/:id" element={<StaffTaskPage />} />
        <Route path="lich" element={<StaffWeekPage />} />
        <Route path="tai-khoan" element={<AccountPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
