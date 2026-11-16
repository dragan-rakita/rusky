import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION } from './constants';

let opened: Promise<IDBPDatabase> | null = null;

/** The device's store: `reviews` (one row per grade) and `meta` (sync cursor, cached content). */
export function openRuskyDb(): Promise<IDBPDatabase> {
  opened ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('reviews', { keyPath: 'id' });
      db.createObjectStore('meta');
    },
  });
  return opened;
}
