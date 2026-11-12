import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorState, Spinner } from './ui'

/** An trang theo vai tro o client; backend van kiem tra quyen o moi API. */
export default function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/dang-nhap" replace state={{ from: loc.pathname + loc.search }} />
  if (roles && !roles.includes(user.role))
    return (
      <div className="container section">
        <ErrorState message="Bạn không có quyền truy cập trang này." />
      </div>
    )
  return <>{children}</>
}
