-- Tiec Nha - schema khoi tao. Tien te: DECIMAL(15,2) VND. Thoi gian: gio dia phuong Asia/Ho_Chi_Minh.

CREATE TABLE users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(160) NOT NULL,
  phone         VARCHAR(20),
  password_hash VARCHAR(100) NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  role          VARCHAR(20)  NOT NULL,           -- CUSTOMER | COORDINATOR | STAFF | ADMIN
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  address       VARCHAR(255),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE staff (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT,
  full_name  VARCHAR(120) NOT NULL,
  phone      VARCHAR(20),
  email      VARCHAR(160),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  note       VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_staff_user UNIQUE (user_id),
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE staff_skills (
  staff_id BIGINT NOT NULL,
  skill    VARCHAR(20) NOT NULL,                  -- CHEF | ASSISTANT_CHEF | SERVER | SETUP | DRIVER
  PRIMARY KEY (staff_id, skill),
  CONSTRAINT fk_skill_staff FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE TABLE party_services (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(30)  NOT NULL,
  name         VARCHAR(120) NOT NULL,
  tagline      VARCHAR(255),
  description  TEXT,
  image        VARCHAR(255),
  min_guests   INT NOT NULL DEFAULT 1,
  sort_order   INT NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_service_code UNIQUE (code)
);

CREATE TABLE dish_categories (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE dishes (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  image       VARCHAR(255),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_dish_category FOREIGN KEY (category_id) REFERENCES dish_categories(id)
);

CREATE TABLE menus (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  service_id       BIGINT NOT NULL,
  name             VARCHAR(150) NOT NULL,
  slug             VARCHAR(160) NOT NULL,
  summary          VARCHAR(255),
  description      TEXT,
  image            VARCHAR(255),
  price            DECIMAL(15,2) NOT NULL,
  price_unit       VARCHAR(10) NOT NULL,          -- TABLE | GUEST
  guests_per_table INT,                           -- bat buoc khi price_unit = TABLE
  min_quantity     INT NOT NULL DEFAULT 1,        -- so ban / so khach toi thieu
  featured         BOOLEAN NOT NULL DEFAULT FALSE,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_menu_slug UNIQUE (slug),
  CONSTRAINT fk_menu_service FOREIGN KEY (service_id) REFERENCES party_services(id),
  CONSTRAINT ck_menu_price CHECK (price >= 0),
  CONSTRAINT ck_menu_table CHECK (price_unit <> 'TABLE' OR guests_per_table > 0)
);

CREATE TABLE menu_dishes (
  menu_id    BIGINT NOT NULL,
  dish_id    BIGINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (menu_id, dish_id),
  CONSTRAINT fk_md_menu FOREIGN KEY (menu_id) REFERENCES menus(id),
  CONSTRAINT fk_md_dish FOREIGN KEY (dish_id) REFERENCES dishes(id)
);

CREATE TABLE addons (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  price       DECIMAL(15,2) NOT NULL,
  charge_type VARCHAR(12) NOT NULL,               -- FIXED | PER_GUEST | PER_TABLE
  unit_label  VARCHAR(30) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT ck_addon_price CHECK (price >= 0)
);

CREATE TABLE bookings (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  code              VARCHAR(20) NOT NULL,
  customer_id       BIGINT NOT NULL,
  contact_name      VARCHAR(120) NOT NULL,
  contact_phone     VARCHAR(20)  NOT NULL,
  service_id        BIGINT NOT NULL,
  menu_id           BIGINT NOT NULL,
  start_time        DATETIME NOT NULL,
  end_time          DATETIME NOT NULL,
  address           VARCHAR(255) NOT NULL,
  guest_count       INT NOT NULL,
  table_count       INT,
  budget            DECIMAL(15,2),
  note              VARCHAR(1000),
  -- ban chup gia tai thoi diem gui yeu cau (chi la tam tinh)
  menu_name_snapshot  VARCHAR(150) NOT NULL,
  menu_price_snapshot DECIMAL(15,2) NOT NULL,
  menu_unit_snapshot  VARCHAR(10) NOT NULL,
  estimated_total   DECIMAL(15,2) NOT NULL,
  status            VARCHAR(20) NOT NULL,         -- NEW | CONSULTING | QUOTED | AWAITING_DEPOSIT | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
  payment_status    VARCHAR(20) NOT NULL,         -- UNPAID | DEPOSIT_PAID | PAID | REFUNDED
  assignment_status VARCHAR(20) NOT NULL,         -- UNASSIGNED | ASSIGNED | DONE
  accepted_quote_id BIGINT,
  cancel_requested  BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_reason     VARCHAR(500),
  cancelled_by      BIGINT,
  cancelled_at      DATETIME,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version           BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT uq_booking_code UNIQUE (code),
  CONSTRAINT fk_booking_customer FOREIGN KEY (customer_id) REFERENCES users(id),
  CONSTRAINT fk_booking_service FOREIGN KEY (service_id) REFERENCES party_services(id),
  CONSTRAINT fk_booking_menu FOREIGN KEY (menu_id) REFERENCES menus(id),
  CONSTRAINT ck_booking_time CHECK (end_time > start_time),
  CONSTRAINT ck_booking_guests CHECK (guest_count > 0)
);
CREATE INDEX ix_booking_start ON bookings(start_time);
CREATE INDEX ix_booking_status ON bookings(status);
CREATE INDEX ix_booking_customer ON bookings(customer_id);

CREATE TABLE booking_addons (
  booking_id BIGINT NOT NULL,
  addon_id   BIGINT NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  addon_name_snapshot VARCHAR(150) NOT NULL,
  unit_price_snapshot DECIMAL(15,2) NOT NULL,
  charge_type_snapshot VARCHAR(12) NOT NULL,
  PRIMARY KEY (booking_id, addon_id),
  CONSTRAINT fk_ba_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_ba_addon FOREIGN KEY (addon_id) REFERENCES addons(id)
);

CREATE TABLE booking_status_history (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id  BIGINT NOT NULL,
  from_status VARCHAR(20),
  to_status   VARCHAR(20) NOT NULL,
  changed_by  BIGINT,
  note        VARCHAR(500),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bsh_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_bsh_user FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE quotes (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id     BIGINT NOT NULL,
  version_no     INT NOT NULL,
  status         VARCHAR(12) NOT NULL,            -- DRAFT | SENT | ACCEPTED | SUPERSEDED
  subtotal       DECIMAL(15,2) NOT NULL,
  total          DECIMAL(15,2) NOT NULL,
  deposit_amount DECIMAL(15,2) NOT NULL,
  valid_until    DATE NOT NULL,
  notes          VARCHAR(1000),
  terms          VARCHAR(2000),
  created_by     BIGINT NOT NULL,
  sent_at        DATETIME,
  accepted_at    DATETIME,
  accepted_by    BIGINT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_quote_version UNIQUE (booking_id, version_no),
  CONSTRAINT fk_quote_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_quote_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT ck_quote_deposit CHECK (deposit_amount >= 0 AND deposit_amount <= total)
);

CREATE TABLE quote_items (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote_id    BIGINT NOT NULL,
  item_type   VARCHAR(10) NOT NULL,               -- MENU | ADDON | FEE | DISCOUNT
  description VARCHAR(255) NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL,
  unit        VARCHAR(30) NOT NULL,
  unit_price  DECIMAL(15,2) NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qi_quote FOREIGN KEY (quote_id) REFERENCES quotes(id)
);

ALTER TABLE bookings ADD CONSTRAINT fk_booking_quote FOREIGN KEY (accepted_quote_id) REFERENCES quotes(id);

CREATE TABLE payments (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id      BIGINT NOT NULL,
  type            VARCHAR(10) NOT NULL,           -- DEPOSIT | BALANCE | REFUND
  amount          DECIMAL(15,2) NOT NULL,
  method          VARCHAR(20) NOT NULL,           -- CASH | BANK_TRANSFER | CARD | OTHER
  reference_code  VARCHAR(100),
  paid_at         DATETIME NOT NULL,
  recorded_by     BIGINT NOT NULL,
  note            VARCHAR(500),
  idempotency_key VARCHAR(80) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_payment_idem UNIQUE (idempotency_key),
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_payment_user FOREIGN KEY (recorded_by) REFERENCES users(id),
  CONSTRAINT ck_payment_amount CHECK (amount > 0)
);
CREATE INDEX ix_payment_paid_at ON payments(paid_at);

CREATE TABLE assignments (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id  BIGINT NOT NULL,
  staff_id    BIGINT NOT NULL,
  task_role   VARCHAR(20) NOT NULL,               -- ky nang dam nhiem
  task        VARCHAR(255) NOT NULL,
  shift_start DATETIME NOT NULL,
  shift_end   DATETIME NOT NULL,
  note        VARCHAR(500),
  status      VARCHAR(12) NOT NULL,               -- ASSIGNED | CONFIRMED | IN_PROGRESS | DONE | CANCELLED
  created_by  BIGINT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_asg_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_asg_staff FOREIGN KEY (staff_id) REFERENCES staff(id),
  CONSTRAINT fk_asg_user FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT ck_asg_time CHECK (shift_end > shift_start)
);
CREATE INDEX ix_asg_staff_time ON assignments(staff_id, shift_start, shift_end);

CREATE TABLE audit_logs (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id   BIGINT,
  action     VARCHAR(60) NOT NULL,
  entity     VARCHAR(40) NOT NULL,
  entity_id  BIGINT,
  detail     VARCHAR(1000),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_audit_created ON audit_logs(created_at);

CREATE TABLE app_settings (
  setting_key   VARCHAR(60) PRIMARY KEY,
  setting_value VARCHAR(500) NOT NULL,
  description   VARCHAR(255)
);
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
  ('prep_minutes',     '180', 'So phut chuan bi truoc gio khai tiec (tinh vao ca lam)'),
  ('teardown_minutes', '90',  'So phut thu don sau gio ket thuc (tinh vao ca lam)'),
  ('deposit_percent',  '30',  'Ty le coc mac dinh tren tong bao gia (%)'),
  ('quote_valid_days', '7',   'So ngay hieu luc mac dinh cua bao gia'),
  ('min_lead_hours',   '24',  'Khach phai dat truoc toi thieu bao nhieu gio');
