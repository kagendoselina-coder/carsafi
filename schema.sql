-- Carsafi vehicle registration and payment tracking schema (PostgreSQL)
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicles (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(40) NOT NULL,
  make VARCHAR(60),
  model VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendants (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wash_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  default_price NUMERIC(12,2) NOT NULL CHECK (default_price >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TYPE payment_status AS ENUM ('paid', 'unpaid', 'partial');

CREATE TABLE services (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
  wash_type_id BIGINT NOT NULL REFERENCES wash_types(id),
  attendant_id BIGINT REFERENCES attendants(id) ON DELETE SET NULL,
  serviced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount_due NUMERIC(12,2) NOT NULL CHECK (amount_due >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status payment_status NOT NULL DEFAULT 'paid',
  payment_method VARCHAR(30),
  paid_at TIMESTAMPTZ,
  reference VARCHAR(80),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE VIEW service_payment_status AS
SELECT s.id AS service_id, s.serviced_at, s.amount_due,
       COALESCE(SUM(p.amount), 0) AS amount_paid,
       GREATEST(s.amount_due - COALESCE(SUM(p.amount), 0), 0) AS balance_due,
       CASE WHEN COALESCE(SUM(p.amount), 0) >= s.amount_due THEN 'paid'::payment_status
            WHEN COALESCE(SUM(p.amount), 0) = 0 THEN 'unpaid'::payment_status
            ELSE 'partial'::payment_status END AS payment_status
FROM services s LEFT JOIN payments p ON p.service_id = s.id
GROUP BY s.id;

CREATE INDEX idx_services_serviced_at ON services(serviced_at);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX idx_payments_status ON payments(status);

-- Daily collection report:
-- SELECT DATE(serviced_at) AS service_day, SUM(amount_paid) AS collected
-- FROM service_payment_status WHERE serviced_at >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY DATE(serviced_at) ORDER BY service_day;
