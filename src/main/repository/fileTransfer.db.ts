// usage.ts

import { db } from '../utils/db';

interface User {
  id: number;
  name: string;
}

const insert = db.prepare('INSERT INTO users (name) VALUES (?)');
insert.run('Alice');

const stmt = db.prepare<{}, User>('SELECT * FROM users');
const rows = stmt.all({});
console.log(rows);
