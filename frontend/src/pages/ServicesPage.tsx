import { Link } from 'react-router-dom'
import { useApi } from '../api/useApi'
import type { Addon, PartyService } from '../api/types'
import { EmptyState, ErrorState, Img, PageHeader, Spinner } from '../components/ui'
import { money } from '../utils/format'

const CHARGE: Record<string, string> = { FIXED: '', PER_GUEST: ' (tính theo số khách)', PER_TABLE: ' (tính theo số bàn)' }

export default function ServicesPage() {
  const services = useApi<PartyService[]>('/api/public/services')
  const addons = useApi<Addon[]>('/api/public/addons')
  return (
    <>
      <PageHeader title="Dịch vụ tiệc tại nhà" subtitle="Bốn hình thức tiệc và các dịch vụ bổ sung để bữa tiệc trọn vẹn." crumbs={[{ label: 'Dịch vụ' }]} />
      <section className="section">
        <div className="container">
          {services.loading ? (
            <Spinner />
          ) : services.error ? (
            <ErrorState message={services.error} onRetry={services.reload} />
          ) : !services.data!.length ? (
            <EmptyState title="Chưa có dịch vụ" />
          ) : (
            <div className="stack" style={{ gap: 28 }}>
              {services.data!.map((s, i) => (
                <article key={s.id} className="card" style={{ overflow: 'hidden' }}>
                  <div className="grid grid-2" style={{ gap: 0, alignItems: 'stretch' }}>
                    <div style={{ order: i % 2 ? 2 : 1, minHeight: 280 }}>
                      <Img src={s.image ?? undefined} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="card-pad" style={{ order: i % 2 ? 1 : 2, padding: 36, alignSelf: 'center' }}>
                      <span className="eyebrow">{s.menuCount} thực đơn</span>
                      <h2>{s.name}</h2>
                      <p className="lead">{s.description}</p>
                      <p className="muted small">
                        Áp dụng từ {s.minGuests} khách
                        {s.fromPricePerGuest != null && (
                          <>
                            {' '}
                            · Giá tham khảo từ <strong className="price">{money(s.fromPricePerGuest)}</strong>/khách
                          </>
                        )}
                      </p>
                      <div className="row" style={{ marginTop: 18 }}>
                        <Link to={`/thuc-don?service=${s.code}`} className="btn btn-outline">
                          Xem thực đơn
                        </Link>
                        <Link to={`/dat-tiec?service=${s.code}`} className="btn btn-primary">
                          Đặt {s.name.toLowerCase()}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Tùy chọn thêm</span>
            <h2>Dịch vụ bổ sung</h2>
            <p className="lead">Chọn thêm khi đặt tiệc – giá được cộng vào phần tạm tính.</p>
          </div>
          {addons.loading ? (
            <Spinner />
          ) : addons.error ? (
            <ErrorState message={addons.error} onRetry={addons.reload} />
          ) : (
            <div className="grid grid-3">
              {addons.data!.map((a) => (
                <div key={a.id} className="card card-pad">
                  <h3>{a.name}</h3>
                  <p className="muted small">{a.description}</p>
                  <div className="price">
                    {money(a.price)}/{a.unitLabel}
                    <span className="muted small" style={{ fontWeight: 400 }}>
                      {CHARGE[a.chargeType]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
