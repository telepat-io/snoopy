import type Database from 'better-sqlite3';

export interface Migration {
  id: number;
  name: string;
  up: (db: Database.Database) => void;
}

import baseline from './001_baseline.js';

export const migrations: Migration[] = [baseline];
