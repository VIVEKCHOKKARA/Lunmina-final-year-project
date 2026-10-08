-- Profit Navigator — MySQL Schema
-- Database: Lumina
-- Run: mysql -u root -ppassword < schema.sql

CREATE DATABASE IF NOT EXISTS Lumina;
USE Lumina;

-- ── Users (authentication: owner / shop manager / financial analyst) ─────────
CREATE TABLE IF NOT EXISTS users (
    id            CHAR(36)       NOT NULL DEFAULT (UUID()),
    name          VARCHAR(120)   NOT NULL,
    email         VARCHAR(190)   NOT NULL,
    password_hash VARCHAR(255)   NOT NULL,
    role          ENUM('owner','manager','analyst') NOT NULL,
    avatar_url    MEDIUMTEXT     NULL,
    created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Businesses & Multi-tenant Entities ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
    id          CHAR(36)       NOT NULL,
    owner_id    CHAR(36)       NOT NULL,
    name        VARCHAR(255)   NOT NULL,
    industry    VARCHAR(100)   NULL,
    address     VARCHAR(500)   NULL,
    city        VARCHAR(100)   NULL,
    state       VARCHAR(100)   NULL,
    country     VARCHAR(100)   NULL,
    pincode     VARCHAR(20)    NULL,
    latitude    DECIMAL(10,8)  NULL,
    longitude   DECIMAL(11,8)  NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shops (
    id          CHAR(36)       NOT NULL,
    business_id CHAR(36)       NOT NULL,
    name        VARCHAR(255)   NOT NULL,
    location    VARCHAR(255)   NULL,
    manager_id  CHAR(36)       NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shop_managers (
    id          CHAR(36)       NOT NULL,
    manager_id  CHAR(36)       NOT NULL,
    owner_id    CHAR(36)       NOT NULL,
    shop_id     CHAR(36)       NULL,
    phone       VARCHAR(50)    NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shop_manager_permissions (
    id          CHAR(36)       NOT NULL,
    manager_id  CHAR(36)       NOT NULL,
    page_url    VARCHAR(100)   NOT NULL,
    enabled     TINYINT(1)     NOT NULL DEFAULT 1,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_mgr_page (manager_id, page_url),
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Transactions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
    id          CHAR(36)       NOT NULL DEFAULT (UUID()),
    date        DATE           NOT NULL,
    description VARCHAR(255)   NOT NULL,
    category    VARCHAR(100)   NOT NULL,
    amount      DECIMAL(12,2)  NOT NULL,
    type        ENUM('income','expense') NOT NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_transactions_date (date),
    INDEX idx_transactions_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          CHAR(36)       NOT NULL DEFAULT (UUID()),
    name        VARCHAR(255)   NOT NULL,
    category    VARCHAR(100)   NOT NULL,
    price       DECIMAL(10,2)  NOT NULL,
    units_sold  INT            NOT NULL DEFAULT 0,
    revenue     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    trend       VARCHAR(20)    NOT NULL DEFAULT 'stable',
    cluster     VARCHAR(30)    NOT NULL DEFAULT 'question-mark',
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_products_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Forecasts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecasts (
    id                  CHAR(36)       NOT NULL DEFAULT (UUID()),
    period              VARCHAR(20)    NOT NULL,
    predicted_revenue   DECIMAL(12,2)  NOT NULL,
    predicted_expenses  DECIMAL(12,2)  NOT NULL,
    confidence          DECIMAL(5,4)   NOT NULL DEFAULT 0.0000,
    created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Chat Messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id          CHAR(36)       NOT NULL DEFAULT (UUID()),
    role        VARCHAR(20)    NOT NULL,
    content     TEXT           NOT NULL,
    user_id     VARCHAR(100)   NULL,
    session_id  VARCHAR(100)   NOT NULL DEFAULT 'default',
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_chat_user (user_id),
    INDEX idx_chat_session (session_id),
    INDEX idx_chat_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tutorials (managed by Financial Analyst) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS tutorials (
    id           CHAR(36)      NOT NULL DEFAULT (UUID()),
    title        VARCHAR(255)  NOT NULL,
    description  TEXT          NULL,
    youtube_id   VARCHAR(20)   NOT NULL,
    target_role  ENUM('owner','manager','both') NOT NULL DEFAULT 'both',
    -- Optional per-language YouTube IDs, e.g. {"hi":"abc","te":"xyz"}.
    -- youtube_id remains the default (English) video / fallback.
    video_ids    JSON          NULL,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_tutorials_role (target_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Page Visibility (Analyst controls which pages owner/manager can see) ──────
CREATE TABLE IF NOT EXISTS page_visibility (
    page_url   VARCHAR(100)             NOT NULL,
    role       ENUM('owner','manager')  NOT NULL,
    visible    TINYINT(1)               NOT NULL DEFAULT 1,
    PRIMARY KEY (page_url, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── AI Pricing Recommendations (with Analyst approval workflow) ──────────────
CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id              CHAR(36)       NOT NULL DEFAULT (UUID()),
    product_id      CHAR(36)       NOT NULL,
    product_name    VARCHAR(255)   NOT NULL,
    current_price   DECIMAL(10,2)  NOT NULL,
    suggested_price DECIMAL(10,2)  NOT NULL,
    reason          TEXT           NULL,
    confidence      INT            NOT NULL DEFAULT 0,
    expected_impact VARCHAR(255)   NULL,
    model_used      VARCHAR(30)    NOT NULL DEFAULT 'rule_based',
    status          ENUM('pending','approved','rejected','applied') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at     TIMESTAMP      NULL DEFAULT NULL,
    PRIMARY KEY (id),
    INDEX idx_pricing_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
