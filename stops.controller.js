import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { query } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';

const stopSchema = z.object({
  cityId: z.number().int().positive().nullable().optional(),
  cityName: z.string().min(1).max(120),
  country: z.string().max(120).optional().nullable(),
  arrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departure: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  position: z.number().int().min(0).optional(),
});

export async function listStops(req, res) {
  const rows = await query(
    'SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY position, arrival',
    [req.trip.id]
  );
  res.json({ stops: rows });
}

export async function addStop(req, res) {
  const data = stopSchema.parse(req.body);
  const id = uuid();
  const [{ next: pos }] = await query(
    'SELECT COALESCE(MAX(position),-1)+1 AS next FROM trip_stops WHERE trip_id = ?',
    [req.trip.id]
  );
  await query(
    `INSERT INTO trip_stops (id,trip_id,city_id,city_name,country,arrival,departure,position)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, req.trip.id, data.cityId ?? null, data.cityName, data.country ?? null,
     data.arrival, data.departure, data.position ?? pos]
  );
  const rows = await query('SELECT * FROM trip_stops WHERE id = ?', [id]);
  res.status(201).json({ stop: rows[0] });
}

export async function updateStop(req, res) {
  const data = stopSchema.partial().parse(req.body);
  const map = { cityId:'city_id', cityName:'city_name', country:'country',
                arrival:'arrival', departure:'departure', position:'position' };
  const fields = []; const params = [];
  for (const [k,col] of Object.entries(map)) {
    if (data[k] !== undefined) { fields.push(`${col} = ?`); params.push(data[k]); }
  }
  if (!fields.length) throw new HttpError(400, 'No fields to update');
  params.push(req.params.stopId, req.trip.id);
  await query(`UPDATE trip_stops SET ${fields.join(', ')} WHERE id = ? AND trip_id = ?`, params);
  const rows = await query('SELECT * FROM trip_stops WHERE id = ?', [req.params.stopId]);
  res.json({ stop: rows[0] });
}

export async function deleteStop(req, res) {
  await query('DELETE FROM trip_stops WHERE id = ? AND trip_id = ?',
    [req.params.stopId, req.trip.id]);
  res.status(204).end();
}

// Reorder all stops at once
export async function reorderStops(req, res) {
  const schema = z.object({ order: z.array(z.string().uuid()).min(1) });
  const { order } = schema.parse(req.body);
  for (let i = 0; i < order.length; i++) {
    await query('UPDATE trip_stops SET position = ? WHERE id = ? AND trip_id = ?',
      [i, order[i], req.trip.id]);
  }
  res.json({ ok: true });
}
