import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { query } from '../config/db.js';
import { HttpError } from '../utils/HttpError.js';

const signupSchema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function sign(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, photoUrl: u.photo_url, language: u.language };
}

export async function signup(req, res) {
  const data = signupSchema.parse(req.body);
  const existing = await query('SELECT id FROM users WHERE email = ?', [data.email]);
  if (existing.length) throw new HttpError(409, 'Email already registered');

  const id = uuid();
  const hash = await bcrypt.hash(data.password, 10);
  await query(
    'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
    [id, data.email, hash, data.name]
  );
  const user = { id, email: data.email, name: data.name, photo_url: null, language: 'en' };
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}

export async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const rows = await query('SELECT * FROM users WHERE email = ?', [data.email]);
  if (!rows.length) throw new HttpError(401, 'Invalid credentials');
  const user = rows[0];
  const ok = await bcrypt.compare(data.password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');
  res.json({ token: sign(user), user: publicUser(user) });
}

export async function me(req, res) {
  const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) throw new HttpError(404, 'User not found');
  res.json({ user: publicUser(rows[0]) });
}

export async function updateMe(req, res) {
  const schema = z.object({
    name: z.string().min(1).max(120).optional(),
    photoUrl: z.string().url().max(500).nullable().optional(),
    language: z.string().min(2).max(10).optional(),
  });
  const data = schema.parse(req.body);
  const fields = [];
  const params = [];
  if (data.name !== undefined)     { fields.push('name = ?');      params.push(data.name); }
  if (data.photoUrl !== undefined) { fields.push('photo_url = ?'); params.push(data.photoUrl); }
  if (data.language !== undefined) { fields.push('language = ?');  params.push(data.language); }
  if (fields.length) {
    params.push(req.user.id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  }
  const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(rows[0]) });
}

export async function deleteMe(req, res) {
  await query('DELETE FROM users WHERE id = ?', [req.user.id]);
  res.status(204).end();
}
