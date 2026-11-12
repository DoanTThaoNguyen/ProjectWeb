import { Link, useParams } from 'react-router-dom'
import { useApi } from '../api/useApi'
import type { MenuDetail, MenuSummary } from '../api/types'
import MenuCard from '../components/MenuCard'
import { Alert, ErrorState, Img, PageHeader, Spinner } from '../components/ui'
import { BRAND } from '../config'
import { money } from '../utils/format'

export default function MenuDetailPage() {
  const { slug } = useParams()
  const { data, error, loading, reload } = useApi<MenuDetail>(`/api/public/menus/${slug}`)
  const related = useApi<MenuSummary[]>(data ? `/api/public/menus?service=${data.menu.serviceCode}` : null)

  if (loading) return <Spinner />
  if (error || !data)
    return (
      <div className="container section">
        <ErrorState message={error ?? 'Không tìm thấy thực đơn'} onRetry={reload} />
        <p style={{ textAlign: 'center' }}>
          <Link to="/thuc-don">← Quay lại danh sách thực đơn</Link>
        </p>
      </div>
    )
  const m = data.menu
  const byTable = m.priceUnit === 'TABLE'
  const dishCount = data.dishGroups.reduce((n, g) => n + g.dishes.length, 0)

  return (
    <>
      <PageHeader title={m.name} subtitle={m.summary} crumbs={[{ to: '/thuc-don', label: 'Thực đơn' }, { label: m.name }]} />
      <section className="section">
        <div className="container detail-grid">
          <div>
            <div className="detail-hero">
              <Img src={m.image ?? undefined} alt={m.name} loading="eager" />
            </div>
            {data.description && (
              <p className="lead" style={{ marginTop: 24 }}>
                {data.description}
              </p>
            )}
            <h2 style={{ marginTop: 32 }}>Danh sách món ({dishCount} món)</h2>
            {data.dishGroups.map((g) => (
              <div className="dish-group" key={g.category}>
                <h3>{g.category}</h3>
                <ul className="dish-list">
                  {g.dishes.map((d) => (
                    <li key={d.id}>
                      <div>
                        <strong>{d.name}</strong>
                        {d.description && <span>{d.description}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <aside className="card price-panel">
            <span className="badge badge-warn">{m.serviceName}</span>
            <div className="price-big" style={{ marginTop: 14 }}>
              {money(m.price)}
              <small>{byTable ? ' /bàn' : ' /khách'}</small>
            </div>
            <dl className="kv">
              <dt>Đơn vị tính</dt>
              <dd>{byTable ? 'Theo bàn' : 'Theo khách (suất)'}</dd>
              {byTable && (
                <>
                  <dt>Số khách tiêu chuẩn</dt>
                  <dd>{m.guestsPerTable} khách/bàn</dd>
                  <dt>Quy đổi</dt>
                  <dd>≈ {money(m.pricePerGuest)}/khách</dd>
                </>
              )}
              <dt>Tối thiểu</dt>
              <dd>
                {m.minQuantity} {byTable ? 'bàn' : 'khách'}
              </dd>
              <dt>Bao gồm</dt>
              <dd>Nguyên liệu, nấu & phục vụ</dd>
            </dl>
            {m.active ? (
              <Link to={`/dat-tiec?menu=${m.slug}`} className="btn btn-primary btn-lg btn-block">
                Đặt thực đơn này
              </Link>
            ) : (
              <Alert tone="warn">Thực đơn này đã ngừng phục vụ. Vui lòng chọn thực đơn khác.</Alert>
            )}
            <a href={BRAND.hotlineHref} className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
              Hoặc gọi {BRAND.hotline} để tư vấn
            </a>
            <p className="disclaimer">Giá tham khảo, chưa gồm dịch vụ bổ sung và phí di chuyển. Giá chính thức theo báo giá được gửi cho bạn.</p>
          </aside>
        </div>
      </section>
      {related.data && related.data.filter((r) => r.id !== m.id).length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2>Thực đơn {m.serviceName.toLowerCase()} khác</h2>
            <div className="grid grid-3" style={{ marginTop: 24 }}>
              {related.data
                .filter((r) => r.id !== m.id)
                .slice(0, 3)
                .map((r) => (
                  <MenuCard key={r.id} m={r} />
                ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
