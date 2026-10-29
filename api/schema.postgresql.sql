CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  name_prefix VARCHAR(40) NOT NULL DEFAULT '',
  name VARCHAR(100) NOT NULL,
  member_type VARCHAR(20),
  department VARCHAR(100) NOT NULL DEFAULT '',
  phone VARCHAR(20) NOT NULL DEFAULT '',
  profile_image TEXT,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','staff','super_admin')),
  active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_state (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  payload JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  room_number VARCHAR(100) NOT NULL,
  building VARCHAR(100) NOT NULL,
  capacity SMALLINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  description VARCHAR(500) NOT NULL DEFAULT '',
  equipment JSONB NOT NULL,
  visual VARCHAR(40) NOT NULL DEFAULT '',
  image TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id VARCHAR(100) PRIMARY KEY,
  room_id VARCHAR(100),
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(100) NOT NULL,
  user_email VARCHAR(254) NOT NULL,
  department VARCHAR(100) NOT NULL DEFAULT '',
  title VARCHAR(200) NOT NULL,
  purpose VARCHAR(200) NOT NULL DEFAULT '',
  attendees SMALLINT NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  equipment JSONB NOT NULL,
  note TEXT NOT NULL,
  signature TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  prep_status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (prep_status IN ('waiting','accepted','preparing','completed')),
  approved_by VARCHAR(100),
  approved_at VARCHAR(40),
  rejection_reason TEXT,
  created_at VARCHAR(40) NOT NULL,
  details JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings(room_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, start_date);

CREATE TABLE IF NOT EXISTS migrations (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imported_by BIGINT NOT NULL REFERENCES users(id),
  imported_users INTEGER NOT NULL DEFAULT 0
);
