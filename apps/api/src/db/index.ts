import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../env';
import * as schema from './schema';

const client = new Database(env.databaseUrl);

// SQLite turns foreign keys off per connection, which makes every cascade inert.
client.pragma('foreign_keys = ON');
client.pragma('journal_mode = WAL');

export const db = drizzle(client, { schema });
