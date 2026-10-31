const { getSql, mapRowToModel, mapRowToCombo } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = await getSql();
    if (!sql) {
      return res.status(200).json({
        connected: false,
        message: 'DATABASE_URL 환경변수가 아직 설정되지 않았습니다 (로컬 모드 동작 중).',
        models: [],
        combos: [],
        sharedPlan: null
      });
    }

    const modelRows = await sql`SELECT * FROM storage_models ORDER BY created_at ASC`;
    const comboRows = await sql`SELECT * FROM saved_combos ORDER BY created_at DESC`;

    let sharedPlan = null;
    const planId = req.query && req.query.plan ? String(req.query.plan).trim() : '';
    if (planId) {
      const planRows = await sql`SELECT * FROM shared_plans WHERE id = ${planId} LIMIT 1`;
      if (planRows.length > 0) {
        const p = planRows[0];
        sharedPlan = {
          id: p.id,
          title: p.title,
          spaceConfig: typeof p.space_config === 'string' ? JSON.parse(p.space_config) : p.space_config,
          plans: typeof p.plans === 'string' ? JSON.parse(p.plans) : p.plans,
          activePlanId: p.active_plan_id || 'plan-a'
        };
      }
    }

    return res.status(200).json({
      connected: true,
      models: modelRows.map(mapRowToModel),
      combos: comboRows.map(mapRowToCombo),
      sharedPlan
    });
  } catch (err) {
    console.error('Bootstrap API Error:', err);
    return res.status(200).json({
      connected: false,
      error: err.message,
      models: [],
      combos: [],
      sharedPlan: null
    });
  }
};
