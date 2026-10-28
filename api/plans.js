const { getSql } = require('./_db');

function generateShortId() {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let id = '';
  for (let i = 0; i < 7; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

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
      const id = req.query && req.query.id ? String(req.query.id).trim() : '';
      if (!id) {
        return res.status(400).json({ error: 'Missing plan id' });
      }
      const rows = await sql`SELECT * FROM shared_plans WHERE id = ${id} LIMIT 1`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      const p = rows[0];
      return res.status(200).json({
        id: p.id,
        title: p.title,
        spaceConfig: typeof p.space_config === 'string' ? JSON.parse(p.space_config) : p.space_config,
        plans: typeof p.plans === 'string' ? JSON.parse(p.plans) : p.plans,
        activePlanId: p.active_plan_id || 'plan-a'
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.spaceConfig || !body.plans) {
        return res.status(400).json({ error: 'Invalid plan payload' });
      }

      const id = body.id || generateShortId();
      const title = body.title || '공유된 3D 수납 배치도';
      const spaceConfigJson = JSON.stringify(body.spaceConfig);
      const plansJson = JSON.stringify(body.plans);
      const activePlanId = body.activePlanId || 'plan-a';

      await sql`
        INSERT INTO shared_plans (id, title, space_config, plans, active_plan_id)
        VALUES (${id}, ${title}, ${spaceConfigJson}::jsonb, ${plansJson}::jsonb, ${activePlanId})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          space_config = EXCLUDED.space_config,
          plans = EXCLUDED.plans,
          active_plan_id = EXCLUDED.active_plan_id;
      `;

      return res.status(201).json({ ok: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Plans API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
