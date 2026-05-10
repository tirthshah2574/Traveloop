import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { query } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';

const noteSchema = z.object({
  body: z.string().min(1).max(10000),
  stopId: z.string().uuid().nullable().optional(),
});

const shape = n => ({
  id: n.id, tripId: n.trip_id, stopId: n.stop_id,
  body: n.body, createdAt: n.created_at, updatedAt: n.updated_at,
});

export async function list(req, res) {
  const rows = await query('SELECT * FROM trip_notes WHERE trip_id = ? ORDER BY created_at DESC', [req.trip.id]);
  res.json({ notes: rows.map(shape) });
}

export async function create(req, res) {
  const d = noteSchema.parse(req.body);
  const id = uuid();
  await query('INSERT INTO trip_notes (id,trip_id,stop_id,body) VALUES (?,?,?,?)',
    [id, req.trip.id, d.stopId ?? null, d.body]);
  const rows = await query('SELECT * FROM trip_notes WHERE id = ?', [id]);
  res.status(201).json({ note: shape(rows[0]) });
}

export async function update(req, res) {
  const d = noteSchema.partial().parse(req.body);
  const map = { body:'body', stopId:'stop_id' };
  const fields = []; const params = [];
  for (const [k,col] of Object.entries(map)) {
    if (d[k] !== undefined) { fields.push(`${col} = ?`); params.push(d[k]); }
  }
  if (!fields.length) throw new HttpError(400, 'No fields to update');
  params.push(req.params.noteId, req.trip.id);
  await query(`UPDATE trip_notes SET ${fields.join(', ')} WHERE id = ? AND trip_id = ?`, params);
  const rows = await query('SELECT * FROM trip_notes WHERE id = ?', [req.params.noteId]);
  res.json({ note: shape(rows[0]) });
}

export async function remove(req, res) {
  await query('DELETE FROM trip_notes WHERE id = ? AND trip_id = ?',
    [req.params.noteId, req.trip.id]);
  res.status(204).end();
}
