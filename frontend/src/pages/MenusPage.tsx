import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi } from '../api/useApi'
import type { MenuSummary, PartyService } from '../api/types'
import MenuCard from '../components/MenuCard'
import { EmptyState, ErrorState, Field, PageHeader, Spinner } from '../components/ui'

const PRICE_RANGES = [
  { v: '', label: 'Tất cả mức giá' },
  { v: '0-150000', label: 'Dưới 150.000đ/khách' },
  { v: '150000-300000', label: '150.000 – 300.000đ/khách' },
  { v: '300000-400000', label: '300.000 – 400.000đ/khách' },
  { v: '400000-', label: 'Trên 400.000đ/khách' },
]

export default function MenusPage() {
  const [params, setParams] = useSearchParams()
  const service = params.get('service') ?? ''
  const price = params.get('price') ?? ''
  const sort = params.get('sort') ?? ''
  const [q, setQ] = useState(params.get('q') ?? '')

  // debounce o tim kiem
  useEffect(() => {
    const t = setTimeout(() => update('q', q.trim()), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function update(key: string, value: string) {
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (value) n.set(key, value)
        else n.delete(key)
        return n
      },
      { replace: true },
    )
  }

  const [min, max] = price ? price.split('-') : ['', '']
  const qs = new URLSearchParams()
  if (params.get('q')) qs.set('q', params.get('q')!)
  if (service) qs.set('service', service)
  if (min) qs.set('minPrice', min)
  if (max) qs.set('maxPrice', max)
  if (sort) qs.set('sort', sort)

  const services = useApi<PartyService[]>('/api/public/services')
  const menus = useApi<MenuSummary[]>('/api/public/menus?' + qs.toString())

  return (
    <>
      <PageHeader title="Thực đơn" subtitle="Tìm thực đơn theo hình thức tiệc và ngân sách. Giá theo bàn được quy đổi để dễ so sánh." crumbs={[{ label: 'Thực đơn' }]} />
      <div className="container">
        <div className="card filters">
          <Field label="Tìm kiếm">
            <input className="input" placeholder="VD: hải sản, chay, buffet…" value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Field label="Hình thức">
            <select className="input" value={service} onChange={(e) => update('service', e.target.value)}>
              <option value="">Tất cả</option>
              {services.data?.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Khoảng giá (quy đổi/khách)">
            <select className="input" value={price} onChange={(e) => update('price', e.target.value)}>
              {PRICE_RANGES.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sắp xếp">
            <select className="input" value={sort} onChange={(e) => update('sort', e.target.value)}>
              <option value="">Nổi bật</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
          </Field>
        </div>

        <div className="chips" role="tablist" aria-label="Lọc nhanh theo hình thức">
          <button className={`chip ${!service ? 'active' : ''}`} onClick={() => update('service', '')}>
            Tất cả
          </button>
          {services.data?.map((s) => (
            <button key={s.code} className={`chip ${service === s.code ? 'active' : ''}`} onClick={() => update('service', s.code)}>
              {s.name}
            </button>
          ))}
        </div>

        <section style={{ paddingBottom: 80 }}>
          {menus.loading ? (
            <Spinner />
          ) : menus.error ? (
            <ErrorState message={menus.error} onRetry={menus.reload} />
          ) : !menus.data!.length ? (
            <EmptyState
              title="Không tìm thấy thực đơn phù hợp"
              action={
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setQ('')
                    setParams({}, { replace: true })
                  }}
                >
                  Xóa bộ lọc
                </button>
              }
            >
              Thử bỏ bớt điều kiện lọc hoặc tìm với từ khóa khác.
            </EmptyState>
          ) : (
            <>
              <p className="result-count">{menus.data!.length} thực đơn đang phục vụ</p>
              <div className="grid grid-3">
                {menus.data!.map((m) => (
                  <MenuCard key={m.id} m={m} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
