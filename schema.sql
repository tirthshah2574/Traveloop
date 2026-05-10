-- Traveloop MySQL schema
-- Run: mysql -u root -p < src/db/schema.sql  (or use `npm run migrate`)

CREATE DATABASE IF NOT EXISTS traveloop
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE traveloop;

CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  photo_url     VARCHAR(500) NULL,
  language      VARCHAR(10)  NOT NULL DEFAULT 'en',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Reusable city catalog (for City Search)
CREATE TABLE IF NOT EXISTS cities (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  country     VARCHAR(120) NOT NULL,
  region      VARCHAR(120) NULL,
  cost_index  DECIMAL(5,2) NOT NULL DEFAULT 0,
  popularity  INT          NOT NULL DEFAULT 0,
  image_url   VARCHAR(500) NULL,
  description TEXT         NULL,
  UNIQUE KEY uniq_city_country (name, country),
  INDEX idx_city_name (name),
  INDEX idx_city_country (country)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trips (
  id          CHAR(36)     PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  name        VARCHAR(190) NOT NULL,
  description TEXT         NULL,
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  cover_image VARCHAR(500) NULL,
  budget      DECIMAL(12,2) NULL,
  is_public   TINYINT(1)   NOT NULL DEFAULT 0,
  public_slug VARCHAR(40)  NULL UNIQUE,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_trip_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_trip_user (user_id)
) ENGINE=InnoDB;

-- A stop = one city included in the trip itinerary
CREATE TABLE IF NOT EXISTS trip_stops (
  id          CHAR(36)     PRIMARY KEY,
  trip_id     CHAR(36)     NOT NULL,
  city_id     INT          NULL,
  city_name   VARCHAR(120) NOT NULL,
  country     VARCHAR(120) NULL,
  arrival     DATE         NOT NULL,
  departure   DATE         NOT NULL,
  position    INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stop_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_stop_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
  INDEX idx_stop_trip (trip_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activities (
  id          CHAR(36)     PRIMARY KEY,
  trip_id     CHAR(36)     NOT NULL,
  stop_id     CHAR(36)     NULL,
  city        VARCHAR(120) NOT NULL,
  name        VARCHAR(190) NOT NULL,
  description TEXT         NULL,
  date        DATE         NOT NULL,
  duration    INT          NOT NULL DEFAULT 0,  -- minutes
  cost        DECIMAL(12,2) NOT NULL DEFAULT 0,
  category    VARCHAR(60)  NOT NULL DEFAULT 'general',
  image_url   VARCHAR(500) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_act_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_act_stop FOREIGN KEY (stop_id) REFERENCES trip_stops(id) ON DELETE SET NULL,
  INDEX idx_act_trip (trip_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS packing_items (
  id          CHAR(36)     PRIMARY KEY,
  trip_id     CHAR(36)     NOT NULL,
  name        VARCHAR(190) NOT NULL,
  category    VARCHAR(60)  NOT NULL DEFAULT 'general',
  checked     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pack_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  INDEX idx_pack_trip (trip_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trip_notes (
  id          CHAR(36)     PRIMARY KEY,
  trip_id     CHAR(36)     NOT NULL,
  stop_id     CHAR(36)     NULL,
  body        TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_note_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_note_stop FOREIGN KEY (stop_id) REFERENCES trip_stops(id) ON DELETE SET NULL,
  INDEX idx_note_trip (trip_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS saved_destinations (
  user_id    CHAR(36) NOT NULL,
  city_id    INT      NOT NULL,
  saved_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, city_id),
  CONSTRAINT fk_sd_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sd_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
) ENGINE=InnoDB;
