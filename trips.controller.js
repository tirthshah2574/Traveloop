import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';
import { pool, query } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';

const tripSchema = z.object({
  name: z.string().min(1).max(190),
  description: z.string().max(5000).optional().default(''),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  coverImage: z.string().url().max(500).nullable().optional(),
  budget: z.number().nonnegative().nullable().optional(),
});

function shapeTrip(row, extras = {}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
    coverImage: row.cover_image,
    budget: row.budget != null ? Number(row.budget) : null,
    isPublic: !!row.is_public,
    publicSlug: row.public_slug,
    ...extras,
  };
}

export async function listTrips(req, res) {
  const rows = await query(
    `SELECT t.*,
       (SELECT COUNT(*) FROM trip_stops s WHERE s.trip_id = t.id) AS stop_count,
       (SELECT COALESCE(SUM(cost),0) FROM activities a WHERE a.trip_id = t.id) AS total_cost
     FROM trips t WHERE user_id = ? ORDER BY start_date DESC`,
    [req.user.id]
  );
  res.json({
    trips: rows.map(r => shapeTrip(r, {
      stopCount: Number(r.stop_count),
      totalCost: Number(r.total_cost),
    })),
  });
}

export async function getTrip(req, res) {
  const trip = req.trip;
  const [stops, activities, packing, notes] = await Promise.all([
    query('SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY position, arrival', [trip.id]),
    query('SELECT * FROM activities WHERE trip_id = ? ORDER BY date', [trip.id]),
    query('SELECT * FROM packing_items WHERE trip_id = ? ORDER BY category, name', [trip.id]),
    query('SELECT * FROM trip_notes WHERE trip_id = ? ORDER BY created_at DESC', [trip.id]),
  ]);
  const totalCost = activities.reduce((s, a) => s + Number(a.cost || 0), 0);
  res.json({
    trip: shapeTrip(trip, {
      destinations: stops.map(s => s.city_name),
      stops: stops.map(s => ({
        id: s.id, cityId: s.city_id, cityName: s.city_name, country: s.country,
        arrival: s.arrival, departure: s.departure, position: s.position,
      })),
      activities: activities.map(a => ({
        id: a.id, tripId: a.trip_id, stopId: a.stop_id, city: a.city,
        name: a.name, description: a.description, date: a.date,
        duration: a.duration, cost: Number(a.cost), category: a.category, image: a.image_url,
      })),
      packingItems: packing.map(p => ({
        id: p.id, tripId: p.trip_id, name: p.name, category: p.category, checked: !!p.checked,
      })),
      notes: notes.map(n => ({
        id: n.id, tripId: n.trip_id, stopId: n.stop_id,
        body: n.body, createdAt: n.created_at, updatedAt: n.updated_at,
      })),
      totalCost,
    }),
  });
}

export async function createTrip(req, res) {
  const data = tripSchema.parse(req.body);
  const id = uuid();
  await query(
    `INSERT INTO trips (id,user_id,name,description,start_date,end_date,cover_image,budget)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, req.user.id, data.name, data.description, data.startDate, data.endDate,
     data.coverImage ?? null, data.budget ?? null]
  );
  const rows = await query('SELECT * FROM trips WHERE id = ?', [id]);
  res.status(201).json({ trip: shapeTrip(rows[0]) });
}

export async function updateTrip(req, res) {
  const data = tripSchema.partial().parse(req.body);
  const map = {
    name: 'name', description: 'description', startDate: 'start_date',
    endDate: 'end_date', coverImage: 'cover_image', budget: 'budget',
  };
  const fields = []; const params = [];
  for (const [k, col] of Object.entries(map)) {
    if (data[k] !== undefined) { fields.push(`${col} = ?`); params.push(data[k]); }
  }
  if (fields.length) {
    params.push(req.trip.id);
    await query(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`, params);
  }
  const rows = await query('SELECT * FROM trips WHERE id = ?', [req.trip.id]);
  res.json({ trip: shapeTrip(rows[0]) });
}

export async function deleteTrip(req, res) {
  await query('DELETE FROM trips WHERE id = ?', [req.trip.id]);
  res.status(204).end();
}

// Public sharing
export async function setPublic(req, res) {
  const schema = z.object({ isPublic: z.boolean() });
  const { isPublic } = schema.parse(req.body);
  let slug = req.trip.public_slug;
  if (isPublic && !slug) slug = crypto.randomBytes(8).toString('hex');
  await query('UPDATE trips SET is_public = ?, public_slug = ? WHERE id = ?',
    [isPublic ? 1 : 0, isPublic ? slug : null, req.trip.id]);
  res.json({ isPublic, publicSlug: isPublic ? slug : null });
}

export async function getPublicTrip(req, res) {
  const rows = await query('SELECT * FROM trips WHERE public_slug = ? AND is_public = 1', [req.params.slug]);
  if (!rows.length) throw new HttpError(404, 'Trip not found');
  const trip = rows[0];
  const [stops, activities] = await Promise.all([
    query('SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY position', [trip.id]),
    query('SELECT * FROM activities WHERE trip_id = ? ORDER BY date', [trip.id]),
  ]);
  res.json({
    trip: {
      name: trip.name, description: trip.description,
      startDate: trip.start_date, endDate: trip.end_date,
      coverImage: trip.cover_image,
      stops: stops.map(s => ({ city: s.city_name, country: s.country, arrival: s.arrival, departure: s.departure })),
      activities: activities.map(a => ({
        city: a.city, name: a.name, description: a.description,
        date: a.date, duration: a.duration, cost: Number(a.cost), category: a.category,
      })),
    },
  });
}

// Copy a public trip into the current user's account
export async function copyPublicTrip(req, res) {
  const rows = await query('SELECT * FROM trips WHERE public_slug = ? AND is_public = 1', [req.params.slug]);
  if (!rows.length) throw new HttpError(404, 'Trip not found');
  const src = rows[0];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const newTripId = uuid();
    await conn.execute(
      `INSERT INTO trips (id,user_id,name,description,start_date,end_date,cover_image,budget)
       VALUES (?,?,?,?,?,?,?,?)`,
      [newTripId, req.user.id, `${src.name} (copy)`, src.description,
       src.start_date, src.end_date, src.cover_image, src.budget]
    );
    const [stops] = await conn.execute('SELECT * FROM trip_stops WHERE trip_id = ?', [src.id]);
    const stopIdMap = {};
    for (const s of stops) {
      const newId = uuid(); stopIdMap[s.id] = newId;
      await conn.execute(
        `INSERT INTO trip_stops (id,trip_id,city_id,city_name,country,arrival,departure,position)
         VALUES (?,?,?,?,?,?,?,?)`,
        [newId, newTripId, s.city_id, s.city_name, s.country, s.arrival, s.departure, s.position]
      );
    }
    const [acts] = await conn.execute('SELECT * FROM activities WHERE trip_id = ?', [src.id]);
    for (const a of acts) {
      await conn.execute(
        `INSERT INTO activities (id,trip_id,stop_id,city,name,description,date,duration,cost,category,image_url)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [uuid(), newTripId, stopIdMap[a.stop_id] || null, a.city, a.name, a.description,
         a.date, a.duration, a.cost, a.category, a.image_url]
      );
    }
    await conn.commit();
    res.status(201).json({ tripId: newTripId });
  } catch (e) {
    await conn.rollback(); throw e;
  } finally { conn.release(); }
}

// Budget summary
export async function getBudget(req, res) {
  const trip = req.trip;
  const breakdown = await query(
    `SELECT category, COALESCE(SUM(cost),0) AS total
     FROM activities WHERE trip_id = ? GROUP BY category`,
    [trip.id]
  );
  const perDay = await query(
    `SELECT date, COALESCE(SUM(cost),0) AS total
     FROM activities WHERE trip_id = ? GROUP BY date ORDER BY date`,
    [trip.id]
  );
  const total = breakdown.reduce((s, r) => s + Number(r.total), 0);
  const days = Math.max(1,
    Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1);
  res.json({
    budget: trip.budget != null ? Number(trip.budget) : null,
    total,
    averagePerDay: total / days,
    overBudget: trip.budget != null && total > Number(trip.budget),
    byCategory: breakdown.map(r => ({ category: r.category, total: Number(r.total) })),
    byDay: perDay.map(r => ({ date: r.date, total: Number(r.total) })),
  });
}
