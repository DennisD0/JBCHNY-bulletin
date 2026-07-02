// Usage: node scripts/update-bible-reading.js [YYYY-MM-DD]
// Updates bibleReadingDates and bibleReading1 in data/bulletin.en.json
// for the week (Sun–Sat) containing the given date, or today if omitted.

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const DISPLAY = { Ps: 'Psalms' };
function formatReading(raw) {
  if (!raw) return '';
  return raw.replace(/^(\w+) /, (_, abbr) => (DISPLAY[abbr] || abbr) + ' ');
}

const plan = JSON.parse(fs.readFileSync(join(root, 'data/year_reading_plan.json'), 'utf8'));

const arg = process.argv[2];
const today = arg ? new Date(arg) : new Date();
const sunday = new Date(today);
sunday.setDate(today.getDate() - today.getDay());

const dates = [];
const readings = [];
for (let i = 0; i < 7; i++) {
  const d = new Date(sunday);
  d.setDate(sunday.getDate() + i);
  const isoKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  dates.push((d.getMonth() + 1) + '/' + d.getDate());
  readings.push(formatReading(plan[isoKey]) || '');
}

const bulletinPath = join(root, 'data/bulletin.en.json');
const b = JSON.parse(fs.readFileSync(bulletinPath, 'utf8'));
b.bibleReadingDates = dates;
b.bibleReading1 = readings;
fs.writeFileSync(bulletinPath, JSON.stringify(b, null, 2));

console.log('Week:', dates.join(', '));
console.log('Readings updated in bulletin.en.json');
