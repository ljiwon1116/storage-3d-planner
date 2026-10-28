const { neon } = require('@neondatabase/serverless');

let schemaInitialized = false;

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.STORAGE_DATABASE_URL ||
    ''
  );
}

async function getSql() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    return null;
  }
  const sql = neon(dbUrl);

  if (!schemaInitialized) {
    await sql`
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
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS saved_combos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        total_w INTEGER NOT NULL,
        total_d INTEGER NOT NULL,
        max_h INTEGER NOT NULL,
        items JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS shared_plans (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '공유된 3D 수납 배치도',
        space_config JSONB NOT NULL,
        plans JSONB NOT NULL,
        active_plan_id TEXT NOT NULL DEFAULT 'plan-a',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    schemaInitialized = true;
  }

  return sql;
}

function mapRowToModel(row) {
  return {
    id: row.id,
    brand: row.brand,
    lineup: row.lineup,
    name: row.name,
    wTop: Number(row.w_top),
    dTop: Number(row.d_top),
    h: Number(row.h),
    wBot: Number(row.w_bot),
    dBot: Number(row.d_bot),
    shapeType: row.shape_type,
    accessType: row.access_type,
    stackable: Boolean(row.stackable),
    stackingOffset: Number(row.stacking_offset || 3),
    hasFrontHandle: Boolean(row.has_front_handle),
    color: row.color || '#efe7da'
  };
}

function mapRowToCombo(row) {
  return {
    id: row.id,
    name: row.name,
    totalW: Number(row.total_w),
    totalD: Number(row.total_d),
    maxH: Number(row.max_h),
    items: Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]')
  };
}

module.exports = {
  getSql,
  mapRowToModel,
  mapRowToCombo
};
