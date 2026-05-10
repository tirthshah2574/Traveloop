import { pool } from '../config/db.js';

const cities = [
  ['Paris', 'France', 'Europe', 85, 100, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34', 'City of light'],
  ['Tokyo', 'Japan', 'Asia', 80, 98, 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf', 'Neon metropolis'],
  ['New York', 'USA', 'North America', 95, 99, 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9', 'The big apple'],
  ['Bali', 'Indonesia', 'Asia', 35, 90, 'https://images.unsplash.com/photo-1518544866330-95a2bec01c69', 'Island paradise'],
  ['Rome', 'Italy', 'Europe', 70, 92, 'https://images.unsplash.com/photo-1552832230-c0197dd311b5', 'Eternal city'],
  ['Barcelona', 'Spain', 'Europe', 65, 88, 'https://images.unsplash.com/photo-1583422409516-2895a77efded', 'Gaudi & beaches'],
  ['Bangkok', 'Thailand', 'Asia', 30, 87, 'https://images.unsplash.com/photo-1508009603885-50cf7c579365', 'Street food capital'],
  ['Dubai', 'UAE', 'Middle East', 90, 85, 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c', 'Modern marvel'],
  ['London', 'UK', 'Europe', 92, 96, 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad', 'Historic capital'],
  ['Sydney', 'Australia', 'Oceania', 78, 82, 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9', 'Harbour city'],
];

async function run() {
  console.log('Seeding cities…');
  for (const c of cities) {
    await pool.execute(
      `INSERT INTO cities (name,country,region,cost_index,popularity,image_url,description)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE popularity=VALUES(popularity)`,
      c
    );
  }
  console.log('Done.');
  await pool.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
