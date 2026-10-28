const { getSql, mapRowToModel } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = await getSql();
    if (!sql) {
      return res.status(503).json({ connected: false, error: 'Database not configured' });
    }

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM storage_models ORDER BY created_at ASC`;
      return res.status(200).json({ connected: true, models: rows.map(mapRowToModel) });
    }

    if (req.method === 'POST') {
      const m = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!m || !m.id || !m.name) {
        return res.status(400).json({ error: 'Invalid model payload' });
      }

      await sql`
        INSERT INTO storage_models (
          id, brand, lineup, name, w_top, d_top, h, w_bot, d_bot,
          shape_type, access_type, stackable, stacking_offset, has_front_handle, color
        ) VALUES (
          ${m.id},
          ${m.brand || '내 커스텀'},
          ${m.lineup || '기본 라인업'},
          ${m.name},
          ${Number(m.wTop) || 200},
          ${Number(m.dTop) || 200},
          ${Number(m.h) || 120},
          ${Number(m.wBot) || Number(m.wTop) || 200},
          ${Number(m.dBot) || Number(m.dTop) || 200},
          ${m.shapeType || 'box'},
          ${m.accessType || 'top_open'},
          ${Boolean(m.stackable)},
          ${Number(m.stackingOffset ?? 3)},
          ${Boolean(m.hasFrontHandle)},
          ${m.color || '#efe7da'}
        )
        ON CONFLICT (id) DO UPDATE SET
          brand = EXCLUDED.brand,
          lineup = EXCLUDED.lineup,
          name = EXCLUDED.name,
          w_top = EXCLUDED.w_top,
          d_top = EXCLUDED.d_top,
          h = EXCLUDED.h,
          w_bot = EXCLUDED.w_bot,
          d_bot = EXCLUDED.d_bot,
          shape_type = EXCLUDED.shape_type,
          access_type = EXCLUDED.access_type,
          stackable = EXCLUDED.stackable,
          stacking_offset = EXCLUDED.stacking_offset,
          has_front_handle = EXCLUDED.has_front_handle,
          color = EXCLUDED.color;
      `;

      return res.status(201).json({ ok: true, id: m.id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Models API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
