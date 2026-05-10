import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { query } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';

const activitySchema = z.object({
  stopId: z.string().uuid().nullable().optional(),
  city: z.string().min(1).max(120),
  name: z.string().min(1).max(190),
  description: z.string().max(5000).optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.number().int().min(0).default(0),
  cost: z.number().nonnegative().default(0),
  category: z.string().max(60).default('general'),
  image: z.string().url().max(500).nullable().optional(),
});

const shape = a => ({
  id: a.id, tripId: a.trip_id, stopId: a.stop_id, city: a.city,
  name: a.name, description: a.description, date: a.date,
  duration: a.duration, cost: Number(a.cost), category: a.category, image: a.image_url,
});

export async function list(req, res) {
  const rows = await query('SELECT * FROM activities WHERE trip_id = ? ORDER BY date', [req.trip.id]);
  res.json({ activities: rows.map(shape) });
}

export async function create(req, res) {
  const d = activitySchema.parse(req.body);
  const id = uuid();
  await query(
    `INSERT INTO activities (id,trip_id,stop_id,city,name,description,date,duration,cost,category,image_url)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.trip.id, d.stopId ?? null, d.city, d.name, d.description,
     d.date, d.duration, d.cost, d.category, d.image ?? null]
  );
  const rows = await query('SELECT * FROM activities WHERE id = ?', [id]);
  res.status(201).json({ activity: shape(rows[0]) });
}

export async function update(req, res) {
  const d = activitySchema.partial().parse(req.body);
  const map = { stopId:'stop_id', city:'city', name:'name', description:'description',
                date:'date', duration:'duration', cost:'cost', category:'category', image:'image_url' };
  const fields = []; const params = [];
  for (const [k,col] of Object.entries(map)) {
    if (d[k] !== undefined) { fields.push(`${col} = ?`); params.push(d[k]); }
  }
  if (!fields.length) throw new HttpError(400, 'No fields to update');
  params.push(req.params.activityId, req.trip.id);
  await query(`UPDATE activities SET ${fields.join(', ')} WHERE id = ? AND trip_id = ?`, params);
  const rows = await query('SELECT * FROM activities WHERE id = ?', [req.params.activityId]);
  res.json({ activity: shape(rows[0]) });
}

export async function remove(req, res) {
  await query('DELETE FROM activities WHERE id = ? AND trip_id = ?',
    [req.params.activityId, req.trip.id]);
  res.status(204).end();
}

// Activity catalog search (returns suggestions; not tied to a trip)
export async function searchCatalog(req, res) {
  // Simple in-memory catalog. Replace with a real `activities_catalog` table if needed.
  const catalog = [
    { name: 'Eiffel Tower visit', city: 'Paris', category: 'sightseeing', cost: 30, duration: 120 },
    { name: 'Louvre Museum',       city: 'Paris', category: 'culture',     cost: 22, duration: 180 },
    { name: 'Sushi making class',  city: 'Tokyo', category: 'food',        cost: 65, duration: 150 },
    { name: 'Shibuya night tour',  city: 'Tokyo', category: 'nightlife',   cost: 40, duration: 120 },
    { name: 'Colosseum tour',      city: 'Rome',  category: 'culture',     cost: 25, duration: 120 },
    { name: 'Bali beach surfing',  city: 'Bali',  category: 'adventure',   cost: 50, duration: 180 },
    { name: 'Sagrada Familia',     city: 'Barcelona', category: 'culture', cost: 26, duration: 90 },
    { name: 'Street food crawl',   city: 'Bangkok',   category: 'food',    cost: 20, duration: 180 },
    { name: 'Burj Khalifa view',   city: 'Dubai', category: 'sightseeing', cost: 50, duration: 90 },
    { name: 'Central Park walk',   city: 'New York', category: 'sightseeing', cost: 0, duration: 90 },
  ];
  const { q, city, category, maxCost } = req.query;
  let out = catalog;
  if (q) out = out.filter(a => a.name.toLowerCase().includes(String(q).toLowerCase()));
  if (city) out = out.filter(a => a.city.toLowerCase() === String(city).toLowerCase());
  if (category) out = out.filter(a => a.category === category);
  if (maxCost) out = out.filter(a => a.cost <= Number(maxCost));
  res.json({ activities: out });
}
