-- Premium Dating Platform - Database Schema (PostgreSQL)
-- This schema is designed to seamlessly support automated AI bots that can
-- later be transitioned to real human profiles by toggling is_bot flags.

-- ============================================================
-- Users table: authentication and core identity
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),                      -- NULL for social logins
    full_name       VARCHAR(255) NOT NULL,
    auth_provider   VARCHAR(50) DEFAULT 'email',        -- email | google | facebook
    auth_provider_id VARCHAR(255),                       -- external provider user id
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider_id ON users(auth_provider_id);

-- ============================================================
-- Profiles table: dating profile data with is_bot flag
-- ============================================================
CREATE TABLE profiles (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    full_name       VARCHAR(255),
    gender          VARCHAR(20) NOT NULL,               -- Man | Woman
    age             INTEGER NOT NULL,
    bio             TEXT,
    location        VARCHAR(255),
    interests       TEXT[],                             -- tags: hiking, cooking, etc.
    photo_url       VARCHAR(500),
    tier            VARCHAR(20) DEFAULT 'Standard',     -- Standard | Premium | Elite
    is_bot          BOOLEAN DEFAULT FALSE,              -- TRUE for AI companions
    bot_persona     VARCHAR(100),                       -- persona identifier for AI routing
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_is_bot ON profiles(is_bot);
CREATE INDEX idx_profiles_tier ON profiles(tier);

-- ============================================================
-- Wallet / Monetization table
-- ============================================================
CREATE TABLE wallets (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance         DECIMAL(10,2) DEFAULT 50.00,        -- mock starting balance
    currency        VARCHAR(3) DEFAULT 'USD',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- ============================================================
-- Transactions table: unlock purchases
-- ============================================================
CREATE TABLE transactions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    profile_id      INTEGER REFERENCES profiles(id),
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'USD',
    payment_method  VARCHAR(50) DEFAULT 'wallet',        -- wallet | stripe | paypal
    payment_status  VARCHAR(50) DEFAULT 'completed',       -- completed | pending | failed
    transaction_ref VARCHAR(255),                          -- gateway reference
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_profile_id ON transactions(profile_id);

-- ============================================================
-- Unlocked Partners table: tracks which profiles are unlocked
-- ============================================================
CREATE TABLE unlocked_partners (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    profile_id      INTEGER REFERENCES profiles(id),
    unlocked_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, profile_id)
);

CREATE INDEX idx_unlocked_user_id ON unlocked_partners(user_id);
CREATE INDEX idx_unlocked_profile_id ON unlocked_partners(profile_id);

-- ============================================================
-- Messages table: chat messages (from bot logic perspective)
-- ============================================================
CREATE TABLE messages (
    id              SERIAL PRIMARY KEY,
    sender_id       INTEGER REFERENCES profiles(id),       -- sender is a profile
    receiver_id     INTEGER REFERENCES profiles(id),       -- receiver is a profile
    content         TEXT NOT NULL,
    is_bot          BOOLEAN DEFAULT FALSE,                 -- was this message bot-generated
    conversation_id UUID,                                  -- groups chat sessions
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read         BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_is_bot ON messages(is_bot);

-- ============================================================
-- Notifications table: interest notifications
-- ============================================================
CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    profile_id      INTEGER REFERENCES profiles(id),       -- who is interested
    message         VARCHAR(500) NOT NULL,
    type            VARCHAR(50) DEFAULT 'interest',        -- interest | message | system
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
