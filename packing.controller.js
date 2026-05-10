import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { query } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';

const itemSchema = z.object({
  name: z.string().min(1).max(190),
  category: z.string().max(60).default('general'),
  checked: z.boolean().optional().default(false),
});

const shape = p => ({ id: p.id, tripId: p.trip_id, name: p.name, category: p.category, checked: !!p.checked });

export async function list(req, res) {
  const rows = await query('SELECT * FROM packing_items WHERE trip_id = ? ORDER BY category, name', [req.trip.id]);
  res.json({ items: rows.map(shape) });
}

export async function create(req, res) {
  const d = itemSchema.parse(req.body);
  const id = uuid();
  await query('INSERT INTO packing_items (id,trip_id,name,category,checked) VALUES (?,?,?,?,?)',
    [id, req.trip.id, d.name, d.category, d.checked ? 1 : 0]);
  const rows = await query('SELECT * FROM packing_items WHERE id = ?', [id]);
  res.status(201).json({ item: shape(rows[0]) });
}

export async function update(req, res) {
  const d = itemSchema.partial().parse(req.body);
  const map = { name:'name', category:'category', checked:'checked' };
  const fields = []; const params = [];
  for (const [k,col] of Object.entries(map)) {
    if (d[k] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(k === 'checked' ? (d[k] ? 1 : 0) : d[k]);
    }
  }
  if (!fields.length) throw new HttpError(400, 'No fields to update');
  params.push(req.params.itemId, req.trip.id);
  await query(`UPDATE packing_items SET ${fields.join(', ')} WHERE id = ? AND trip_id = ?`, params);
  const rows = await query('SELECT * FROM packing_items WHERE id = ?', [req.params.itemId]);
  res.json({ item: shape(rows[0]) });
}

export async function remove(req, res) {
  await query('DELETE FROM packing_items WHERE id = ? AND trip_id = ?',
    [req.params.itemId, req.trip.id]);
  res.status(204).end();
}

export async function reset(req, res) {
  await query('UPDATE packing_items SET checked = 0 WHERE trip_id = ?', [req.trip.id]);
  res.json({ ok: true });
}
