import { query } from '../config/db.js';

export async function search(req, res) {
  const { q, country, limit = 20 } = req.query;
  const where = []; const params = [];
  if (q)       { where.push('(name LIKE ? OR country LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (country) { where.push('country = ?'); params.push(country); }
  const sql = `SELECT * FROM cities ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY popularity DESC LIMIT ${Math.min(Number(limit) || 20, 100)}`;
  const rows = await query(sql, params);
  res.json({ cities: rows });
}

export async function popular(_req, res) {
  const rows = await query('SELECT * FROM cities ORDER BY popularity DESC LIMIT 8');
  res.json({ cities: rows });
}

export async function listSaved(req, res) {
  const rows = await query(
    `SELECT c.* FROM saved_destinations sd
     JOIN cities c ON c.id = sd.city_id
     WHERE sd.user_id = ? ORDER BY sd.saved_at DESC`, [req.user.id]
  );
  res.json({ cities: rows });
}

export async function save(req, res) {
  const cityId = Number(req.params.cityId);
  await query(
    'INSERT IGNORE INTO saved_destinations (user_id, city_id) VALUES (?, ?)',
    [req.user.id, cityId]
  );
  res.status(201).json({ ok: true });
}

export async function unsave(req, res) {
  await query('DELETE FROM saved_destinations WHERE user_id = ? AND city_id = ?',
    [req.user.id, Number(req.params.cityId)]);
  res.status(204).end();
}
