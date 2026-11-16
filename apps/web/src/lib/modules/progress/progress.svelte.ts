import { replay, type ReviewEvent, type SyncResponse } from '@rusky/core';
import { auth } from '../auth/auth.svelte';
import { content } from '../content/content.svelte';
import { SYNC_DEBOUNCE_MS } from './constants';
import { openRuskyDb } from './db';

type StoredReview = ReviewEvent & { synced: 0 | 1 };

const strip = ({ id, cardId, grade, reviewedAt, firstSide }: StoredReview): ReviewEvent => ({
  id,
  cardId,
  grade,
  reviewedAt,
  firstSide,
});

export function newId(): string {
  // randomUUID only exists on https and localhost; a phone testing over the LAN has neither.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

class ProgressStore {
  events = $state.raw<ReviewEvent[]>([]);
  states = $derived(replay(this.events));
  ready = $state(false);
  pending = $state(0);
  syncing = $state(false);
  lastSyncAt = $state<number | null>(null);
  syncError = $state<string | null>(null);

  #unsynced = new Set<string>();
  #cursor = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;

  #open() {
    return openRuskyDb();
  }

  async load() {
    try {
      const db = await this.#open();
      const rows = (await db.getAll('reviews')) as StoredReview[];
      this.#unsynced = new Set(rows.filter((r) => !r.synced).map((r) => r.id));
      this.#cursor = ((await db.get('meta', 'cursor')) as number | undefined) ?? 0;
      this.lastSyncAt = ((await db.get('meta', 'lastSyncAt')) as number | undefined) ?? null;
      this.events = rows.map(strip);
      this.pending = this.#unsynced.size;
    } catch (e) {
      console.error('Could not open saved progress', e);
    } finally {
      this.ready = true;
    }
  }

  async record(event: ReviewEvent) {
    this.events = [...this.events, event];
    this.#unsynced.add(event.id);
    this.pending = this.#unsynced.size;
    try {
      const db = await this.#open();
      await db.put('reviews', { ...event, synced: 0 } satisfies StoredReview);
    } catch (e) {
      console.error('Could not save a review', e);
    }
    this.scheduleSync();
  }

  scheduleSync(delay = SYNC_DEBOUNCE_MS) {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.sync(), delay);
  }

  /** Sends reviews this device made and takes the ones other devices made. */
  async sync() {
    if (this.syncing || !auth.user || !navigator.onLine) return;
    clearTimeout(this.#timer);
    this.syncing = true;
    this.syncError = null;
    try {
      const outgoing = this.events.filter((e) => this.#unsynced.has(e.id));
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ since: this.#cursor, events: outgoing }),
      });
      if (res.status === 401) {
        auth.forget();
        throw new Error('Signed out. Sign in again to sync.');
      }
      if (!res.ok) throw new Error(`Sync failed (${res.status})`);
      const body = (await res.json()) as SyncResponse;

      const known = new Set(this.events.map((e) => e.id));
      const incoming = body.events.filter((e) => !known.has(e.id));
      const at = Date.now();

      const db = await this.#open();
      const tx = db.transaction(['reviews', 'meta'], 'readwrite');
      const reviews = tx.objectStore('reviews');
      const meta = tx.objectStore('meta');
      await Promise.all([
        ...outgoing.map((e) => reviews.put({ ...e, synced: 1 } satisfies StoredReview)),
        ...incoming.map((e) => reviews.put({ ...e, synced: 1 } satisfies StoredReview)),
        meta.put(body.cursor, 'cursor'),
        meta.put(at, 'lastSyncAt'),
        tx.done,
      ]);

      for (const e of outgoing) this.#unsynced.delete(e.id);
      this.#cursor = body.cursor;
      void content.refresh(body.contentVersion);
      if (incoming.length) this.events = [...this.events, ...incoming];
      this.pending = this.#unsynced.size;
      this.lastSyncAt = at;
    } catch (e) {
      this.syncError = e instanceof Error ? e.message : 'Sync failed';
    } finally {
      this.syncing = false;
    }
  }

  /**
   * After signing out, everything on this device counts as not yet uploaded, so the
   * next sign-in merges it into that account. The server ignores reviews it already has.
   */
  async resetSync() {
    this.#cursor = 0;
    this.#unsynced = new Set(this.events.map((e) => e.id));
    this.pending = this.#unsynced.size;
    this.lastSyncAt = null;
    try {
      const db = await this.#open();
      const tx = db.transaction(['reviews', 'meta'], 'readwrite');
      await Promise.all([
        ...this.events.map((e) =>
          tx.objectStore('reviews').put({ ...e, synced: 0 } satisfies StoredReview),
        ),
        tx.objectStore('meta').put(0, 'cursor'),
        tx.objectStore('meta').delete('lastSyncAt'),
        tx.done,
      ]);
    } catch (e) {
      console.error('Could not reset sync state', e);
    }
  }
}

export const progress = new ProgressStore();
