const { getSql, mapRowToCombo } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
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
      const rows = await sql`SELECT * FROM saved_combos ORDER BY created_at DESC`;
      return res.status(200).json({ connected: true, combos: rows.map(mapRowToCombo) });
    }

    if (req.method === 'POST') {
      const c = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!c || !c.id || !c.name) {
        return res.status(400).json({ error: 'Invalid combo payload' });
      }

      const itemsJson = JSON.stringify(c.items || []);
      await sql`
        INSERT INTO saved_combos (id, name, total_w, total_d, max_h, items)
        VALUES (
          ${c.id},
          ${c.name},
          ${Number(c.totalW) || 100},
          ${Number(c.totalD) || 100},
          ${Number(c.maxH) || 100},
          ${itemsJson}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          total_w = EXCLUDED.total_w,
          total_d = EXCLUDED.total_d,
          max_h = EXCLUDED.max_h,
          items = EXCLUDED.items;
      `;

      return res.status(201).json({ ok: true, id: c.id });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) {
        return res.status(400).json({ error: 'Missing combo id' });
      }
      await sql`DELETE FROM saved_combos WHERE id = ${String(id)}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Combos API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
