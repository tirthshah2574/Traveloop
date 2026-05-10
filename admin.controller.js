import { query } from '../config/db.js';
// Optional admin/analytics. Add real RBAC before using in production.

export async function stats(_req, res) {
  const [users]   = await query('SELECT COUNT(*) AS c FROM users');
  const [trips]   = await query('SELECT COUNT(*) AS c FROM trips');
  const [acts]    = await query('SELECT COUNT(*) AS c FROM activities');
  const topCities = await query(
    `SELECT city_name, COUNT(*) AS uses FROM trip_stops
     GROUP BY city_name ORDER BY uses DESC LIMIT 10`);
  const topActs = await query(
    `SELECT name, COUNT(*) AS uses FROM activities
     GROUP BY name ORDER BY uses DESC LIMIT 10`);
  res.json({
    totals: { users: users.c, trips: trips.c, activities: acts.c },
    topCities, topActivities: topActs,
  });
}
