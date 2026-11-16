-- qryntiq schema for Supabase / PostgreSQL
-- Generated from the app's SQLAlchemy models. Idempotent: safe to run on an
-- empty database and safe to re-run (existing objects and data are left alone).
-- Paste into: Supabase dashboard -> SQL Editor -> New query -> Run.

-- Enum type for question difficulty (CREATE TYPE has no IF NOT EXISTS, so guard it)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficultylevel') THEN
        CREATE TYPE difficultylevel AS ENUM ('EASY', 'MEDIUM', 'HARD');
    END IF;
END$$;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id               VARCHAR NOT NULL,
    name             VARCHAR(100) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    avatar_url       VARCHAR(500),
    bio              TEXT,
    xp               INTEGER,
    streak           INTEGER,
    last_active_date TIMESTAMP WITHOUT TIME ZONE,
    is_admin         BOOLEAN,
    created_at       TIMESTAMP WITHOUT TIME ZONE,
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id          VARCHAR NOT NULL,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    description TEXT,
    icon        VARCHAR(50),
    color       VARCHAR(20),
    sort_order  INTEGER,
    created_at  TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    UNIQUE (name),
    UNIQUE (slug)
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
    id              VARCHAR NOT NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT NOT NULL,
    difficulty      difficultylevel NOT NULL,
    category_id     VARCHAR NOT NULL,
    schema_sql      TEXT NOT NULL,
    sample_data_sql TEXT,
    expected_query  TEXT NOT NULL,
    hint            TEXT,
    sqlite_db_path  VARCHAR(500),
    tags            VARCHAR(500),
    is_published    BOOLEAN,
    sort_order      INTEGER,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY (category_id) REFERENCES categories (id)
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id                VARCHAR NOT NULL,
    user_id           VARCHAR NOT NULL,
    question_id       VARCHAR NOT NULL,
    submitted_sql     TEXT NOT NULL,
    is_correct        BOOLEAN,
    execution_time_ms FLOAT,
    error_message     TEXT,
    created_at        TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (question_id) REFERENCES questions (id)
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id          VARCHAR NOT NULL,
    user_id     VARCHAR NOT NULL,
    question_id VARCHAR NOT NULL,
    created_at  TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (question_id) REFERENCES questions (id)
);
