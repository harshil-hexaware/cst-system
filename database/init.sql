-- ============================================================
-- Customer Support Ticketing System — Normalized PostgreSQL Schema
-- Owned collectively across services (auth-service, user-service,
-- ticket-service) but deployed as one physical DB for this MVP.
-- In a stricter microservices deployment each service would get
-- its own schema/database; tables are namespaced by prefix below
-- to make that split trivial later.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- ROLES & PERMISSIONS (auth-service) ----------
CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL CHECK (name IN ('CUSTOMER','AGENT','MANAGER','ADMIN')),
    description     VARCHAR(255)
);

INSERT INTO roles (name, description) VALUES
 ('CUSTOMER','Raises and tracks own tickets'),
 ('AGENT','Handles assigned tickets'),
 ('MANAGER','Assigns tickets, monitors SLA and agent performance'),
 ('ADMIN','Full system configuration and user management');

CREATE TABLE permissions (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(100) UNIQUE NOT NULL,
    description     VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id         INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ---------- USERS (auth-service owns credentials) ----------
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    role_id             INT NOT NULL REFERENCES roles(id),
    is_active           BOOLEAN DEFAULT TRUE,
    is_verified         BOOLEAN DEFAULT FALSE,
    verification_token  VARCHAR(255),
    verification_expires TIMESTAMPTZ,
    refresh_token_hash  VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

-- ---------- USER PROFILES (user-service, populated via user.created event) ----------
CREATE TABLE user_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,   -- denormalized copy, event-carried from auth-service (user.registered)
    role            VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER','AGENT','MANAGER','ADMIN')),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(30),
    department      VARCHAR(100),
    avatar_url      VARCHAR(500),
    workload_count  INT DEFAULT 0,          -- open tickets currently assigned (agents)
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_user ON user_profiles(user_id);

-- ---------- CATEGORIES (admin-managed, ticket-service) ----------
CREATE TABLE categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL,
    description     VARCHAR(255),
    is_active       BOOLEAN DEFAULT TRUE
);

-- ---------- SLA CONFIGURATIONS ----------
CREATE TABLE sla_configurations (
    id                  SERIAL PRIMARY KEY,
    priority            VARCHAR(20) NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    response_time_mins  INT NOT NULL,
    resolution_time_mins INT NOT NULL,
    UNIQUE(priority)
);
INSERT INTO sla_configurations (priority, response_time_mins, resolution_time_mins) VALUES
 ('LOW', 480, 4320), ('MEDIUM', 240, 1440), ('HIGH', 60, 480), ('CRITICAL', 15, 240);

-- ---------- TICKETS (ticket-service) ----------
CREATE TABLE tickets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number   VARCHAR(20) UNIQUE NOT NULL,      -- e.g. TCK-2026-000123
    subject         VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    category_id     INT REFERENCES categories(id),
    priority        VARCHAR(20) NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')) DEFAULT 'MEDIUM',
    status          VARCHAR(20) NOT NULL CHECK (status IN
                        ('OPEN','IN_PROGRESS','ON_HOLD','ESCALATED','RESOLVED','CLOSED','REOPENED')) DEFAULT 'OPEN',
    customer_id     UUID NOT NULL,                    -- FK to users.id, cross-service reference by id only
    assigned_agent_id UUID,                           -- FK to users.id
    due_at          TIMESTAMPTZ,                       -- derived from SLA at creation/assignment
    sla_breached    BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_agent ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created ON tickets(created_at);
CREATE INDEX idx_tickets_status_agent ON tickets(status, assigned_agent_id); -- common dashboard query

-- ---------- TICKET COMMENTS ----------
CREATE TABLE ticket_comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL,
    is_internal     BOOLEAN DEFAULT FALSE,    -- internal note vs public comment
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);

-- ---------- TICKET ATTACHMENTS ----------
CREATE TABLE ticket_attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    comment_id      UUID REFERENCES ticket_comments(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_path       VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_attachments_ticket ON ticket_attachments(ticket_id);

-- ---------- TICKET HISTORY (audit trail of status/assignment changes) ----------
CREATE TABLE ticket_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by      UUID NOT NULL,
    field_changed   VARCHAR(50) NOT NULL,     -- status | assigned_agent_id | priority ...
    old_value       VARCHAR(255),
    new_value       VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_history_ticket ON ticket_history(ticket_id);

-- ---------- NOTIFICATION RECIPIENTS CACHE (notification-service) ----------
-- Denormalized, event-carried copy of "who to email" — populated by
-- consuming user.registered, so notification-service never needs a
-- synchronous call to auth-service/user-service just to send an email.
CREATE TABLE notification_recipients (
    user_id         UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------- NOTIFICATIONS (notification-service) ----------
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    type            VARCHAR(50) NOT NULL,     -- TICKET_CREATED | ASSIGNED | STATUS_CHANGED | RESOLVED | CLOSED
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    related_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ---------- AUDIT LOGS (admin/system-wide) ----------
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id        UUID,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       VARCHAR(100),
    metadata        JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- Query optimization notes:
-- * idx_tickets_status_agent supports the agent dashboard query
--   (WHERE assigned_agent_id = ? AND status = ?) without a scan.
-- * customer_id / assigned_agent_id are plain UUID columns (not FKs
--   to a users table in this DB) by design — ticket-service must
--   stay independently deployable from auth-service; identity is
--   validated via JWT claims at the gateway, not a DB-level FK.
-- * Use keyset pagination (WHERE created_at < :cursor ORDER BY
--   created_at DESC LIMIT :n) instead of OFFSET for ticket lists
--   once volumes grow — avoids O(n) scan cost of OFFSET paging.
-- ============================================================
