import { query } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';

// Loads trip and ensures the authenticated user owns it.
export async function loadOwnedTrip(req, _res, next) {
  try {
    const tripId = req.params.tripId || req.params.id;
    const rows = await query('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!rows.length) return next(new HttpError(404, 'Trip not found'));
    if (rows[0].user_id !== req.user.id) return next(new HttpError(403, 'Forbidden'));
    req.trip = rows[0];
    next();
  } catch (e) { next(e); }
}
