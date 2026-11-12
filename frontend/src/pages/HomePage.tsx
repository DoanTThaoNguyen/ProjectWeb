import { Link } from 'react-router-dom'
import { useApi } from '../api/useApi'
import type { MenuSummary, PartyService } from '../api/types'
import MenuCard from '../components/MenuCard'
import { ErrorState, Img, Spinner } from '../components/ui'
import { BRAND } from '../config'
import { money } from '../utils/format'

const STEPS = [
  { t: 'Chọn thực đơn', d: 'Xem các gói tiệc bàn, buffet, BBQ, teabreak và giá tham khảo.' },
  { t: 'Gửi yêu cầu', d: 'Điền ngày giờ, địa chỉ, số khách. Hệ thống tính giá tạm cho bạn.' },
  { t: 'Nhận báo giá', d: 'Điều phối viên tư vấn và gửi báo giá chi tiết từng hạng mục.' },
  { t: 'Đặt cọc giữ lịch', d: 'Chấp nhận báo giá, đặt cọc để chúng tôi xác nhận lịch tiệc.' },
  { t: 'Thưởng thức tiệc', d: 'Đội bếp đến tận nhà nấu, setup, phục vụ và dọn dẹp.' },
]

const FEATURES = [
  { i: '👨‍🍳', t: 'Nấu nóng tại nhà bạn', d: 'Đầu bếp mang nguyên liệu tươi và nấu tại chỗ – món lên bàn vẫn còn nóng hổi.' },
  { i: '🧾', t: 'Báo giá minh bạch', d: 'Từng dòng chi phí rõ ràng: thực đơn, dịch vụ thêm, phí khác. Không phát sinh âm thầm.' },
  { i: '🍽️', t: 'Trọn gói setup', d: 'Bàn ghế, khăn trải, chén đĩa, trang trí theo chủ đề – bạn chỉ việc mời khách.' },
  { i: '🧹', t: 'Dọn dẹp sau tiệc', d: 'Thu dọn, rửa chén bát, trả lại không gian gọn gàng như trước khi tiệc bắt đầu.' },
  { i: '📅', t: 'Theo dõi tiến độ online', d: 'Xem trạng thái đơn, báo giá và các khoản đã thanh toán ngay trên website.' },
  { i: '🌿', t: 'Thực đơn linh hoạt', d: 'Có món chay, món cho trẻ nhỏ; điều chỉnh khẩu vị theo yêu cầu gia đình.' },
]

const REVIEWS = [
  { q: 'Mâm cỗ giỗ ông nội rất tươm tất, các cô chú khen món gà và lẩu. Đội phục vụ nhanh nhẹn, dọn dẹp sạch sẽ.', n: 'Chị Minh Anh', s: 'Tiệc bàn 5 mâm – Quận 7' },
  { q: 'Tiệc BBQ sân thượng cho nhóm bạn cực vui, đầu bếp nướng tại chỗ nên thịt thơm và nóng. Sẽ đặt lại!', n: 'Anh Quốc Bảo', s: 'BBQ 30 khách – Phú Nhuận' },
  { q: 'Teabreak cho buổi ra mắt sản phẩm trình bày đẹp, đúng giờ. Báo giá rõ ràng nên duyệt chi rất nhanh.', n: 'Chị Thu Trang', s: 'Teabreak 80 khách – Quận 1' },
]

const FAQ = [
  { q: 'Cần đặt trước bao lâu?', a: 'Bạn nên đặt trước tối thiểu 24 giờ; với tiệc trên 100 khách nên đặt trước 3–5 ngày để chúng tôi chuẩn bị nguyên liệu và nhân sự.' },
  { q: 'Giá trên website đã là giá cuối cùng chưa?', a: 'Giá trên website là giá tham khảo và giá tạm tính. Giá chính thức nằm trong báo giá do điều phối viên gửi, bạn xem và chấp nhận trực tuyến.' },
  { q: 'Đặt cọc bao nhiêu và thanh toán thế nào?', a: 'Mức cọc ghi rõ trong từng báo giá (mặc định khoảng 30%). Đơn được xác nhận khi chúng tôi ghi nhận đã nhận cọc; phần còn lại thanh toán sau tiệc.' },
  { q: 'Nhà tôi bếp nhỏ có tổ chức được không?', a: 'Được. Đội bếp mang theo bếp phụ, dụng cụ và có thể sơ chế trước. Điều phối viên sẽ hỏi kỹ không gian khi tư vấn.' },
  { q: 'Tôi muốn hủy tiệc thì sao?', a: 'Trước khi chấp nhận báo giá, bạn có thể tự hủy trên website. Sau khi chấp nhận, bạn gửi yêu cầu hủy để điều phối viên xử lý theo điều kiện trong báo giá.' },
]

export default function HomePage() {
  const services = useApi<PartyService[]>('/api/public/services')
  const menus = useApi<MenuSummary[]>('/api/public/menus')
  // API sap xep thuc don noi bat len truoc
  const featured = (menus.data ?? []).slice(0, 6)

  return (
    <>
      <section className="hero">
        <Img className="hero-bg" src="/images/hero.jpg" alt="Bàn tiệc nhiều món ăn đặt trên bàn gỗ" loading="eager" />
        <div className="container hero-content">
          <span className="hero-badge">★ Đầu bếp nấu tận nhà · Phục vụ trọn gói</span>
          <h1>
            Tiệc ngon <em>tại gia</em>, trọn vẹn từ bếp đến bàn
          </h1>
          <p className="lead">
            Tiệc bàn, buffet, BBQ, teabreak cho sinh nhật, giỗ chạp, tân gia hay tiệc công ty. Bạn chọn thực đơn – chúng tôi lo nấu, setup,
            phục vụ và dọn dẹp.
          </p>
          <div className="hero-actions">
            <Link to="/dat-tiec" className="btn btn-gold btn-lg">
              Đặt tiệc ngay
            </Link>
            <Link to="/thuc-don" className="btn btn-light btn-lg">
              Xem thực đơn
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <strong>4</strong>
              <span>hình thức tiệc</span>
            </div>
            <div>
              <strong>10+</strong>
              <span>thực đơn soạn sẵn</span>
            </div>
            <div>
              <strong>24h</strong>
              <span>đặt trước tối thiểu</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="dich-vu">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Gói tiệc</span>
            <h2>Chọn hình thức tiệc phù hợp</h2>
            <p className="lead">Mỗi hình thức có nhiều thực đơn với mức giá khác nhau. Giá hiển thị là giá tham khảo quy đổi theo khách.</p>
          </div>
          {services.loading ? (
            <Spinner />
          ) : services.error ? (
            <ErrorState message={services.error} onRetry={services.reload} />
          ) : (
            <div className="grid grid-4">
              {services.data!.map((s) => (
                <Link key={s.id} to={`/thuc-don?service=${s.code}`} className="service-card">
                  <Img src={s.image ?? undefined} alt={s.name} />
                  <div className="service-card-body">
                    <h3>{s.name}</h3>
                    <p>{s.tagline}</p>
                    {s.fromPricePerGuest != null && <span className="from">Từ {money(s.fromPricePerGuest)}/khách</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head-row">
            <div>
              <span className="eyebrow">Thực đơn nổi bật</span>
              <h2 style={{ margin: 0 }}>Được nhiều gia đình lựa chọn</h2>
            </div>
            <Link to="/thuc-don" className="btn btn-outline">
              Xem tất cả thực đơn
            </Link>
          </div>
          {menus.loading ? (
            <Spinner />
          ) : menus.error ? (
            <ErrorState message={menus.error} onRetry={menus.reload} />
          ) : (
            <div className="grid grid-3">
              {featured.map((m) => (
                <MenuCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section" id="quy-trinh">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Quy trình</span>
            <h2>Đặt tiệc chỉ với 5 bước</h2>
            <p className="lead">Theo dõi từng bước ngay trong mục “Đơn của tôi”.</p>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step" key={s.t}>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/dat-tiec" className="btn btn-primary btn-lg">
              Bắt đầu đặt tiệc
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="why">
            <div className="why-img">
              <Img src="/images/about-chef.jpg" alt="Đầu bếp đang chuẩn bị món ăn" />
              <div className="why-badge">
                <strong>100%</strong>
                <span>nấu nóng tại chỗ</span>
              </div>
            </div>
            <div>
              <span className="eyebrow">Vì sao chọn {BRAND.name}</span>
              <h2>Bạn tiếp khách, việc bếp để chúng tôi</h2>
              <div className="grid grid-2" style={{ marginTop: 24, gap: 18 }}>
                {FEATURES.map((f) => (
                  <div className="feature" key={f.t}>
                    <div className="feature-icon" aria-hidden>
                      {f.i}
                    </div>
                    <div>
                      <h3>{f.t}</h3>
                      <p>{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Cảm nhận</span>
            <h2>Khách hàng nói gì</h2>
            <p className="lead small muted">(Nhận xét minh họa cho bản demo)</p>
          </div>
          <div className="grid grid-3">
            {REVIEWS.map((r) => (
              <figure className="card testimonial" key={r.n} style={{ margin: 0 }}>
                <div className="stars" aria-label="5 sao">
                  ★★★★★
                </div>
                <blockquote>“{r.q}”</blockquote>
                <footer>
                  {r.n}
                  <span>{r.s}</span>
                </footer>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="hoi-dap">
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="section-head">
            <span className="eyebrow">Hỏi đáp</span>
            <h2>Câu hỏi thường gặp</h2>
          </div>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Sẵn sàng cho bữa tiệc sắp tới?</h2>
              <p>Gửi yêu cầu trong 3 phút, nhận báo giá chi tiết từ điều phối viên.</p>
            </div>
            <div className="row">
              <a href={BRAND.hotlineHref} className="btn btn-light btn-lg">
                Gọi {BRAND.hotline}
              </a>
              <Link to="/dat-tiec" className="btn btn-gold btn-lg">
                Đặt tiệc ngay
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
