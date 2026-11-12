import { Link } from 'react-router-dom'
import type { MenuSummary } from '../api/types'
import { money } from '../utils/format'
import { Img } from './ui'

export default function MenuCard({ m }: { m: MenuSummary }) {
  const byTable = m.priceUnit === 'TABLE'
  return (
    <Link to={`/thuc-don/${m.slug}`} className="card menu-card">
      <div className="menu-card-img">
        <Img src={m.image ?? undefined} alt={m.name} />
        <span className="menu-card-tag">{m.serviceName}</span>
        {m.featured && <span className="menu-card-hot">Được chọn nhiều</span>}
      </div>
      <div className="menu-card-body">
        <h3>{m.name}</h3>
        <p>{m.summary}</p>
        <div className="menu-card-foot">
          <div>
            <div className="menu-price">
              {money(m.price)}
              <small>{byTable ? '/bàn' : '/khách'}</small>
            </div>
            <div className="menu-price-sub">
              {byTable
                ? `${m.guestsPerTable} khách/bàn · ≈ ${money(m.pricePerGuest)}/khách`
                : `Từ ${m.minQuantity} khách`}
            </div>
          </div>
          <span className="chev">Xem món →</span>
        </div>
      </div>
    </Link>
  )
}
