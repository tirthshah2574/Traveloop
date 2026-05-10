import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedTrip } from '../middleware/ownership.js';

import * as auth from '../controllers/auth.controller.js';
import * as trips from '../controllers/trips.controller.js';
import * as stops from '../controllers/stops.controller.js';
import * as activities from '../controllers/activities.controller.js';
import * as packing from '../controllers/packing.controller.js';
import * as notes from '../controllers/notes.controller.js';
import * as cities from '../controllers/cities.controller.js';
import * as admin from '../controllers/admin.controller.js';

const r = Router();

r.get('/health', (_req, res) => res.json({ ok: true }));

// ---- Auth ----
r.post('/auth/signup', h(auth.signup));
r.post('/auth/login',  h(auth.login));
r.get ('/auth/me',     requireAuth, h(auth.me));
r.patch('/auth/me',    requireAuth, h(auth.updateMe));
r.delete('/auth/me',   requireAuth, h(auth.deleteMe));

// ---- Cities (public catalog + saved destinations) ----
r.get   ('/cities/search',        h(cities.search));
r.get   ('/cities/popular',       h(cities.popular));
r.get   ('/cities/saved',         requireAuth, h(cities.listSaved));
r.post  ('/cities/saved/:cityId', requireAuth, h(cities.save));
r.delete('/cities/saved/:cityId', requireAuth, h(cities.unsave));

// ---- Activity catalog (suggestions) ----
r.get('/activities/search', h(activities.searchCatalog));

// ---- Public/shared trips ----
r.get ('/public/trips/:slug',      h(trips.getPublicTrip));
r.post('/public/trips/:slug/copy', requireAuth, h(trips.copyPublicTrip));

// ---- Trips ----
r.get   ('/trips',        requireAuth, h(trips.listTrips));
r.post  ('/trips',        requireAuth, h(trips.createTrip));
r.get   ('/trips/:id',    requireAuth, h(loadOwnedTrip), h(trips.getTrip));
r.patch ('/trips/:id',    requireAuth, h(loadOwnedTrip), h(trips.updateTrip));
r.delete('/trips/:id',    requireAuth, h(loadOwnedTrip), h(trips.deleteTrip));
r.post  ('/trips/:id/share',  requireAuth, h(loadOwnedTrip), h(trips.setPublic));
r.get   ('/trips/:id/budget', requireAuth, h(loadOwnedTrip), h(trips.getBudget));

// ---- Stops ----
r.get   ('/trips/:tripId/stops',          requireAuth, h(loadOwnedTrip), h(stops.listStops));
r.post  ('/trips/:tripId/stops',          requireAuth, h(loadOwnedTrip), h(stops.addStop));
r.post  ('/trips/:tripId/stops/reorder',  requireAuth, h(loadOwnedTrip), h(stops.reorderStops));
r.patch ('/trips/:tripId/stops/:stopId',  requireAuth, h(loadOwnedTrip), h(stops.updateStop));
r.delete('/trips/:tripId/stops/:stopId',  requireAuth, h(loadOwnedTrip), h(stops.deleteStop));

// ---- Activities (per trip) ----
r.get   ('/trips/:tripId/activities',              requireAuth, h(loadOwnedTrip), h(activities.list));
r.post  ('/trips/:tripId/activities',              requireAuth, h(loadOwnedTrip), h(activities.create));
r.patch ('/trips/:tripId/activities/:activityId',  requireAuth, h(loadOwnedTrip), h(activities.update));
r.delete('/trips/:tripId/activities/:activityId',  requireAuth, h(loadOwnedTrip), h(activities.remove));

// ---- Packing ----
r.get   ('/trips/:tripId/packing',           requireAuth, h(loadOwnedTrip), h(packing.list));
r.post  ('/trips/:tripId/packing',           requireAuth, h(loadOwnedTrip), h(packing.create));
r.post  ('/trips/:tripId/packing/reset',     requireAuth, h(loadOwnedTrip), h(packing.reset));
r.patch ('/trips/:tripId/packing/:itemId',   requireAuth, h(loadOwnedTrip), h(packing.update));
r.delete('/trips/:tripId/packing/:itemId',   requireAuth, h(loadOwnedTrip), h(packing.remove));

// ---- Notes ----
r.get   ('/trips/:tripId/notes',           requireAuth, h(loadOwnedTrip), h(notes.list));
r.post  ('/trips/:tripId/notes',           requireAuth, h(loadOwnedTrip), h(notes.create));
r.patch ('/trips/:tripId/notes/:noteId',   requireAuth, h(loadOwnedTrip), h(notes.update));
r.delete('/trips/:tripId/notes/:noteId',   requireAuth, h(loadOwnedTrip), h(notes.remove));

// ---- Admin (optional) ----
r.get('/admin/stats', requireAuth, h(admin.stats));

export default r;
