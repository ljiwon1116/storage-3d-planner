-- Neon PostgreSQL 데이터베이스 스키마 (StorageFit 3D)
-- 참고: api/_db.js가 첫 API 호출 시 자동으로 아래 테이블들을 생성하므로 수동 실행하지 않아도 됩니다.

CREATE TABLE IF NOT EXISTS storage_models (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  lineup TEXT NOT NULL DEFAULT '기본 라인업',
  name TEXT NOT NULL,
  w_top INTEGER NOT NULL,
  d_top INTEGER NOT NULL,
  h INTEGER NOT NULL,
  w_bot INTEGER NOT NULL,
  d_bot INTEGER NOT NULL,
  shape_type TEXT NOT NULL DEFAULT 'box',
  access_type TEXT NOT NULL DEFAULT 'top_open',
  stackable BOOLEAN NOT NULL DEFAULT TRUE,
  stacking_offset INTEGER NOT NULL DEFAULT 3,
  has_front_handle BOOLEAN NOT NULL DEFAULT TRUE,
  color TEXT NOT NULL DEFAULT '#efe7da',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_combos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_w INTEGER NOT NULL,
  total_d INTEGER NOT NULL,
  max_h INTEGER NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '공유된 3D 수납 배치도',
  space_config JSONB NOT NULL,
  plans JSONB NOT NULL,
  active_plan_id TEXT NOT NULL DEFAULT 'plan-a',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
