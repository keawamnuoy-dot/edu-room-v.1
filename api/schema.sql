USE bookking_name;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    name_prefix VARCHAR(40) NOT NULL DEFAULT '',
    name VARCHAR(100) NOT NULL,
    member_type ENUM('instructor', 'staff', 'student', 'external') NULL DEFAULT NULL,
    department VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(20) NOT NULL DEFAULT '',
    profile_image MEDIUMTEXT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin', 'staff', 'super_admin') NOT NULL DEFAULT 'user',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_state (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    payload JSON NOT NULL,
    version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_app_state_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
    room_id VARCHAR(100) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    room_number VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    capacity SMALLINT UNSIGNED NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    description VARCHAR(500) NOT NULL DEFAULT '',
    equipment JSON NOT NULL,
    visual VARCHAR(40) NOT NULL DEFAULT '',
    image MEDIUMTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(100) NOT NULL PRIMARY KEY,
    room_id VARCHAR(100) NULL,
    user_id BIGINT UNSIGNED NULL,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(254) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT '',
    title VARCHAR(200) NOT NULL,
    purpose VARCHAR(200) NOT NULL DEFAULT '',
    attendees SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    equipment JSON NOT NULL,
    note TEXT NOT NULL,
    signature MEDIUMTEXT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') NOT NULL,
    prep_status ENUM('waiting', 'accepted', 'preparing', 'completed') NOT NULL DEFAULT 'waiting',
    approved_by VARCHAR(100) NULL,
    approved_at VARCHAR(40) NULL,
    rejection_reason TEXT NULL,
    created_at VARCHAR(40) NOT NULL,
    details JSON NOT NULL,
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_bookings_room_dates (room_id, start_date, end_date),
    INDEX idx_bookings_user_date (user_id, start_date),
    INDEX idx_bookings_status_date (status, start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migrations (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by BIGINT UNSIGNED NOT NULL,
    imported_users INT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT chk_migrations_singleton CHECK (id = 1),
    CONSTRAINT fk_migrations_user FOREIGN KEY (imported_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
